#!/usr/bin/env python3

from engine.ml_engine import _train_dummy_model

if __name__ == "__main__":
    print("Training dummy model...")
    model = _train_dummy_model()
    print("Model trained and saved.")