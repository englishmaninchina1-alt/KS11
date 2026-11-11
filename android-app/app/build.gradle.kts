import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Signing credentials stay out of the build file. keystore.properties is
// gitignored; without it the release task still runs but produces no signed APK.
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.isFile) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}

// Bump both for each release; the versioned APK filename follows versionName.
val appVersionCode = 2
val appVersionName = "1.1"

android {
    namespace = "page.freebuff.ks11"
    compileSdk = 35

    defaultConfig {
        applicationId = "page.freebuff.ks11"
        minSdk = 24
        targetSdk = 35
        versionCode = appVersionCode
        versionName = appVersionName
    }

    signingConfigs {
        if (keystorePropertiesFile.isFile) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.findByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }
}

// Publish the signed APK under a name that says which build it is, e.g.
// wordy-world-android-1.0.apk. Run after assembleRelease.
tasks.register<Copy>("versionedReleaseApk") {
    group = "build"
    description = "Copies the signed release APK to a versioned filename."
    dependsOn("assembleRelease")
    from(layout.buildDirectory.dir("outputs/apk/release")) {
        include("app-release.apk")
        rename("app-release.apk", "wordy-world-android-$appVersionName.apk")
    }
    into(layout.buildDirectory.dir("outputs/apk/versioned"))
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
}
