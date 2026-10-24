// swift-tools-version:5.5

import PackageDescription

let package = Package(
    name: "tauri-plugin-signer",
    platforms: [
        .macOS(.v10_13),
        .iOS(.v15),
    ],
    products: [
        .library(
            name: "tauri-plugin-signer",
            type: .static,
            targets: ["tauri-plugin-signer"]),
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api")
    ],
    targets: [
        .target(
            name: "tauri-plugin-signer",
            dependencies: [
                .byName(name: "Tauri")
            ],
            path: "Sources")
    ]
)
