TRIA Phase 20.2 Walkthrough

Quick steps to generate data and run tests:

1) Create synthetic dataset

python tools/generate_synthetic_dataset.py synthetic_tria.npz --num 20

2) (Optional) Train (stubbed when torch isn't installed)

python tools/train_tria.py

3) Run unit tests

npm run test:unit

This walkthrough is intentionally short and intended to help other contributors run the local TRIA experiments and unit tests.
