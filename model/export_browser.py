"""Konversi offline model asli; website tidak menjalankan Python.

Jalankan dengan Keras 3.13.2 (backend JAX), numpy, h5py, dan joblib.
Pemetaan Gender dikonfirmasi dari notebook training, sel 24: M=1, F=0.
"""
import hashlib
import json
import os
from pathlib import Path

os.environ.setdefault("KERAS_BACKEND", "jax")
import keras
import numpy as np
from joblib.numpy_pickle import NumpyUnpickler

ROOT = Path(__file__).resolve().parent
NOTEBOOK = "https://colab.research.google.com/drive/1T8Fb687MnmcojKM0AwS7QSyGtumRQ47o"
FEATURES = ["Gender", "Age (Month)", "Weight", "Height"]
HEADS = {"BBU": "Weight for Age", "TBU": "Height for Age", "BBTB": "Weight for Height"}


class ScalerState:
    """Hanya menampung atribut scaler; tidak memuat kode scikit-learn dari pickle."""


class RestrictedScalerReader(NumpyUnpickler):
    def find_class(self, module, name):
        if (module, name) == ("sklearn.preprocessing._data", "StandardScaler"):
            return ScalerState
        allowed = {
            ("joblib.numpy_pickle", "NumpyArrayWrapper"),
            ("numpy", "ndarray"), ("numpy", "dtype"),
            ("numpy._core.multiarray", "_reconstruct"),
            ("numpy._core.multiarray", "scalar"),
            ("numpy.core.multiarray", "_reconstruct"),
            ("numpy.core.multiarray", "scalar"),
        }
        if (module, name) not in allowed:
            raise ValueError(f"Objek scaler tidak didukung: {module}.{name}")
        return super().find_class(module, name)


def read_scaler():
    path = ROOT / "scaler_tumbuh.pkl"
    with path.open("rb") as stream:
        scaler = RestrictedScalerReader(str(path), stream, ensure_native_byte_order=True).load()
    assert isinstance(scaler, ScalerState)
    assert list(scaler.feature_names_in_) == FEATURES[1:]
    assert scaler.n_features_in_ == 3 and scaler.with_mean and scaler.with_std
    assert np.isfinite(scaler.mean_).all() and np.isfinite(scaler.scale_).all()
    assert (scaler.scale_ > 0).all()
    return scaler


def export():
    features = json.loads((ROOT / "features.json").read_text())
    labels = json.loads((ROOT / "labels.json").read_text())
    assert features == FEATURES
    scaler = read_scaler()
    model = keras.models.load_model(ROOT / "model_tumbuh.keras", compile=False, safe_mode=True)
    assert model.input_shape == (None, 4) and list(model.output_names) == list(HEADS)
    manifest = {
        "format": "tumbuh-dense-v1",
        "features": features,
        "genderEncoding": {"male": 1, "female": 0},
        "scaler": {"features": FEATURES[1:], "mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist()},
        "layers": [],
        "outputs": [{"name": name, "labels": labels[target]} for name, target in HEADS.items()],
        "source": {"notebook": NOTEBOOK, "kerasVersion": keras.__version__, "sha256": {}},
    }
    chunks = []
    offset = 0
    for layer in model.layers:
        if isinstance(layer, keras.layers.InputLayer):
            assert layer.name == "input_layer"
            continue
        assert isinstance(layer, keras.layers.Dense), "Exporter hanya mendukung Dense"
        config = layer.get_config()
        assert config["activation"] in ("relu", "softmax") and config["use_bias"]
        kernel, bias = layer.get_weights()
        assert np.isfinite(kernel).all() and np.isfinite(bias).all()
        assert kernel.shape[1] == bias.shape[0]
        manifest["layers"].append({
            "name": layer.name,
            "input": layer.input._keras_history.operation.name,
            "inputSize": int(kernel.shape[0]), "units": int(bias.size),
            "activation": config["activation"],
            "kernelOffset": offset, "biasOffset": offset + kernel.size,
        })
        chunks.extend([kernel.astype("<f4").tobytes(), bias.astype("<f4").tobytes()])
        offset += kernel.size + bias.size
    assert len(manifest["layers"]) == 5
    for head in manifest["outputs"]:
        assert len(head["labels"]) == model.get_layer(head["name"]).units
    weights = b"".join(chunks)
    digest = hashlib.sha256(weights).hexdigest()
    filename = f"weights-{digest[:16]}.bin"
    manifest["weights"] = {"file": filename, "bytes": len(weights), "sha256": digest}
    for name in ("model_tumbuh.keras", "scaler_tumbuh.pkl", "features.json", "labels.json"):
        manifest["source"]["sha256"][name] = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
    manifest["modelId"] = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()
    (ROOT / filename).write_bytes(weights)
    (ROOT / "browser-model.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Exported {len(weights)} bytes; model {manifest['modelId'][:16]}")
    return model, scaler, manifest


if __name__ == "__main__":
    export()
