import java.util.Properties

plugins {
    id("com.android.application") version "9.3.1"
}

// Without keystore.properties the release APK stays unsigned
val keystoreProperties = Properties().apply {
    val propFile = file("keystore.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    namespace = "app.bithanko.lockdown"
    compileSdk = 36
    defaultConfig {
        applicationId = "app.bithanko.lockdown"
        // DISALLOW_AIRPLANE_MODE and DISALLOW_CONFIG_LOCATION need API 28
        minSdk = 28
        targetSdk = 36
        versionCode = 5
        versionName = "0.5.0"
    }
    signingConfigs {
        if (!keystoreProperties.isEmpty) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.findByName("release")
        }
    }
    // The lists in profiles/ and the signer APK that provision.sh puts in signer/
    sourceSets["main"].assets.directories.add("profiles")
    sourceSets["main"].assets.directories.add("signer")
}
