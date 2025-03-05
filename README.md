# OctoPwn Extension for VSCode

This extension provides stubs and IntelliSense support for the OctoPwn framework, along with the ability to run OctoPwn plugins directly from VSCode.

## Features

- Type hints and code completion for OctoPwn APIs
- Improved developer experience when creating plugins for OctoPwn
- Run OctoPwn plugins directly from VSCode
- Configure OctoPwn binary, license, and extra files paths

## Requirements

- Visual Studio Code 1.60.0 or newer
- Python extension for VSCode
- OctoPwn binary installed on your system

## Extension Settings

This extension contributes the following settings:

* `octopwn.enableStubs`: Enable/disable OctoPwn stubs for better code completion
* `octopwn.binaryPath`: Path to the OctoPwn binary
* `octopwn.licensePath`: Path to the OctoPwn license file
* `octopwn.extraFilesPath`: Path to additional files needed by OctoPwn

## Usage

### Setting Up

1. After installing the extension, the OctoPwn stubs will be automatically added to your Python analysis paths.
2. Configure the OctoPwn binary path in the settings.
3. Optionally configure the license file path and extra files path.

### Running Plugins

To run an OctoPwn plugin:

1. Right-click on a Python file in the explorer or editor
2. Select "OctoPwn: Run Plugin" from the context menu
3. The plugin will be executed with the configured OctoPwn binary
4. Output will be displayed in the "OctoPwn" output channel

You can also run the command "OctoPwn: Run Plugin" from the command palette (Ctrl+Shift+P).

### Manual Configuration

To manually configure the stubs, run the command:
`OctoPwn: Configure Python Stubs`


