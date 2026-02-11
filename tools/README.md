Tools README

- generate_synthetic_dataset.py: deterministic synthetic spectrogram generator

Examples:

python tools/generate_synthetic_dataset.py synthetic_tria.npz --num 50

Loaded file can be inspected with numpy:

import numpy as np
d = np.load('synthetic_tria.npz')
print(d['left'].shape, d['right'].shape)
