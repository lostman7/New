# AMD GPU Requirements

The AMD stack relies on the ROCm runtime for accelerated inference. Download links below point to the official packages for each operating system supported by ROCm.

## Windows
- ROCm for Windows Preview installer (includes drivers and runtime): https://www.amd.com/en/developer/resources/rocm-hub/rocm-for-windows.html
- Optional Vulkan SDK (for UI shells that leverage Vulkan interop): https://vulkan.lunarg.com/sdk/home#windows

## Linux
- ROCm runtime & driver (Ubuntu/Debian/RHEL flavors): https://rocm.docs.amd.com/en/latest/deploy/linux/index.html
- ROCm development tools (rocminfo, rocm-smi, hipcc): https://rocm.docs.amd.com/projects/install-on-linux/en/latest/how-to/native-install/ubuntu.html
- Optional MIGraphX / MIOpen libraries for optimized inference: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/how-to/native-install/additional.html

## macOS
- AMD GPUs are not supported by ROCm on macOS. Use the platform’s built-in Metal backend instead (see Intel/Apple requirements).

## Verification Steps
1. Install the GPU driver/runtime for your operating system.
2. Reboot to finalize driver activation.
3. Run `rocminfo` or `hipinfo` to verify ROCm detects your GPU.
4. For containerized deployments, pass through the `/dev/kfd` and `/dev/dri` devices.

## Environment Variables
- `HSA_OVERRIDE_GFX_VERSION` for enabling support on newer GPUs if ROCm lags official support.
- `ROCM_PATH` to help toolchains locate HIP/ROCclr components.
