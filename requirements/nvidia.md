# NVIDIA GPU Requirements

Install the CUDA runtime and matching driver packages to unlock GPU acceleration for NVIDIA hardware.

## Windows
- GeForce/RTX Game Ready Driver or Studio Driver: https://www.nvidia.com/Download/index.aspx
- CUDA Toolkit (includes cuDNN installers): https://developer.nvidia.com/cuda-downloads
- Optional TensorRT runtime: https://developer.nvidia.com/tensorrt

## Linux
- NVIDIA proprietary driver (latest production branch): https://www.nvidia.com/en-us/drivers/unix/
- CUDA Toolkit `.run` or distro-specific packages: https://developer.nvidia.com/cuda-downloads
- cuDNN library for deep learning workloads: https://developer.nvidia.com/cudnn
- (Optional) TensorRT server/inference libraries: https://developer.nvidia.com/tensorrt

## macOS
- Dedicated NVIDIA GPUs are no longer supported on recent macOS releases. Use Metal (Apple/Intel) guidance for Apple Silicon.

## Verification Steps
1. Install the display driver appropriate for your GPU generation.
2. Install the CUDA Toolkit and optional cuDNN/TensorRT components.
3. Verify with `nvidia-smi` that the driver is active and CUDA is available.
4. Run `nvcc --version` to confirm the CUDA compiler toolchain is in your PATH.

## Environment Variables
- `CUDA_HOME` or `CUDA_PATH` to point tooling at the CUDA installation directory.
- `LD_LIBRARY_PATH` (Linux) or `PATH` (Windows) adjustments to surface CUDA/cuDNN/TensorRT libraries.
