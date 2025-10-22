# Intel GPU Requirements

Intel GPUs leverage the oneAPI runtime for compute acceleration alongside platform-specific drivers.

## Windows
- Intel Graphics Driver (Arc / Iris Xe / UHD): https://www.intel.com/content/www/us/en/download/19344/intel-arc-iris-xe-graphics-whql-driver.html
- Intel oneAPI Base Toolkit (includes DPC++, Level Zero, MKL): https://www.intel.com/content/www/us/en/developer/tools/oneapi/base-toolkit-download.html
- Optional oneAPI AI Analytics Toolkit for optimized deep learning frameworks: https://www.intel.com/content/www/us/en/developer/tools/oneapi/ai-analytics-toolkit-download.html

## Linux
- Intel GPU firmware and Mesa drivers via distribution packages (ensure `intel-media-driver` and `mesa-opencl` are installed).
- Intel oneAPI Base Toolkit: https://www.intel.com/content/www/us/en/developer/articles/tool/oneapi-standalone-components.html
- Optional OpenVINO runtime for optimized inference pipelines: https://www.intel.com/content/www/us/en/developer/tools/openvino-toolkit/download.html

## macOS
- Apple Silicon and Intel Macs rely on Metal. Install Xcode Command Line Tools and ensure the latest macOS graphics updates are applied.

## Verification Steps
1. Install the GPU driver stack for your platform.
2. Install the oneAPI runtime or OpenVINO components.
3. Run `sycl-ls` or `clinfo` to confirm Level Zero / OpenCL devices are enumerated.
4. Execute a sample (e.g., `oneapi-cli run matrix`) to validate kernels dispatch to the GPU.

## Environment Variables
- `ONEAPI_ROOT` to reference the oneAPI installation path.
- `LD_LIBRARY_PATH`/`DYLD_LIBRARY_PATH` or `PATH` updates so that Level Zero and OpenCL libraries are discoverable.
