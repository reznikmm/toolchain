# Ada toolchain installation Action

This action install an Ada development environment.

## Inputs
### `distrib`
The development environment distribution. Could be `fsf` (default) or `community`.

### `target`
The compiler target. Could be `native` (default), `arm-elf` or `riscv32-elf`.
Currently `fsf` distribution supports only `native` target.

### `community_year`
The version of `community` environment. Value: `2020`, `2019`. Default is the most recent.

### `install_dir`
Path to a directory to install a `community` distribution. Default is a temporary folder.
This could be used together with the `actions/cache` action to cache the installation.
See an example below.

## Getting Started

### Using the native FSF GNAT and the GNAT Community ARM cross compiler:
```yaml
steps:
- uses: actions/checkout@master
- uses: ada-actions/toolchain@dev
  with:
    distrib: fsf
    target: native
- run: gprbuild hello
- uses: ada-actions/toolchain@dev
  with:
    distrib: community
    target: arm-elf
- run: gprbuild --target=arm-eabi --RTS=zfp-microbit hello
```

### Using the GNAT Community and a cache directory
```yaml
steps:
- uses: actions/cache@v2
  with:
    path: ./cached_gnat
    key: ${{ runner.os }}-gnat-ce-2020
- uses: ada-actions/toolchain@dev
  with:
    distrib: community
    target: arm-elf
    install_dir: ./cached_gnat
- run: gprbuild --target=arm-eabi --RTS=zfp-microbit hello
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)
