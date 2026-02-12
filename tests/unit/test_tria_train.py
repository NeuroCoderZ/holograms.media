def test_tria_skeleton():
    try:
        import torch
        from tools import train_tria as tt
        import numpy as np
        import tempfile
        import os

        # create tiny deterministic dataset: N=4, F=32, T=16
        X = np.ones((4, 32, 16), dtype=np.float32) * 0.1
        Y = np.ones_like(X) * 0.2
        fd, path = tempfile.mkstemp(suffix='.npz')
        os.close(fd)
        np.savez_compressed(path, input=X, target=Y)

        # run single-epoch training on CPU
        model = tt.train_tria(path, epochs=1, batch_size=2, lr=1e-3, device='cpu')
        assert model is not None

        # cleanup
        os.remove(path)
    except ImportError:
        # torch not installed in environment: basic smoke test of module
        from tools import train_tria as tt
        assert hasattr(tt, 'TriaResUNet')
        assert hasattr(tt, 'train_tria')
