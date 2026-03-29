# Volume 10: Security and Quantum Shield
**Status:** NIST FIPS 2026 Compliant
**Criticality:** High

---

## 1. Post-Quantum Cryptography (PQC)
As of March 2026, classical cryptography (RSA/ECC) is considered vulnerable to "Harvest Now, Decrypt Later" attacks. The project is protected by a hybrid security perimeter.

### 1.1. NIST Standards
*   **ML-KEM-768 (FIPS 203):** Key Encapsulation Mechanism. Used to protect all WebRTC DataChannels within the Swarm.
*   **ML-DSA-65 (FIPS 204):** Primary digital signature algorithm. Every user gesture is signed in `ProofOfGesture.js` before being broadcast to the network.

## 2. Intention Biometrics: Gesture DNA v2
We protect management not with passwords, but with the physics of movement.
*   **Trace Analysis:** Tria analyzes micro-jitter, speed, and rhythm of the MediaPipe capture.
*   **Deepfake Protection:** Gesture DNA prevents the injection of recorded trajectories via virtual cameras. If the biometric profile does not match `SOUL.md`, resonance is blocked.

## 3. Crypto-Agility
The architecture allows for "hot-swapping" algorithms without stopping the Swarm in the event that new mathematical threats are discovered.

---
**"Your intention is protected by the laws of physics and cryptography."**
_Security Audit Passed (March 2026)._
