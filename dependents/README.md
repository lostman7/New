# Dependency Bundle Catalog

This directory centralizes download links and guidance for runtime and GPU driver packages across Windows, Linux, and macOS. The manifest is consumed by the Dual AI Studio server to recommend the right downloads based on the detected operating system and GPU vendor.

- `manifest.json` – Machine-readable list of runtimes, tooling, and GPU drivers grouped by platform and vendor.
- Additional archives or scripts can be placed here if you want to provide offline installers alongside the metadata.

## Usage

1. Start the Dual AI Studio server (`npm start`).
2. The UI automatically calls `/api/system/info`, which loads this manifest and surfaces recommended packages under **System Readiness** in the sidebar.
3. If you obtain newer driver packages or add additional providers, update `manifest.json` so the UI and API deliver the latest guidance.

The manifest is intentionally simple JSON, enabling external tooling to parse it for automated installers or bundle generators when you create production builds for Windows, Linux, or macOS.
