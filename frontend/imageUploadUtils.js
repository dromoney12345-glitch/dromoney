export const openGallery = async ({ onSelectFile, fileNamePrefix = "gallery-photo" }) => {
    try {
        if (isFlutterBridgeAvailable()) {
            const result = await window.flutter_inappwebview.callHandler("openGallery", {
                source: "gallery",
                accept: "image/png, image/jpeg, image/jpg, image/webp",
                multiple: false,
            })

            const isSuccess =
                result?.success === true ||
                Boolean(result?.base64 || result?.base64String || result?.data?.base64)

            if (result && isSuccess) {
                let selectedFile = null
                const base64Value = result?.base64 || result?.base64String || result?.data?.base64
                const mimeType = result?.mimeType || result?.type || result?.data?.mimeType || "image/jpeg"
                const originalFileName = result?.fileName || result?.name || result?.data?.fileName || ""

                if (base64Value) {
                    selectedFile = convertBase64ToFile(
                        base64Value,
                        mimeType,
                        fileNamePrefix,
                        originalFileName,
                    )
                } else if (result.file instanceof File || result.file instanceof Blob) {
                    selectedFile = result.file
                }

                if (selectedFile && String(selectedFile.type || "").startsWith("image/")) {
                    onSelectFile(selectedFile)
                }

                // In Flutter app mode, do not fallback to browser picker.
                // Browser picker can show camera/gallery chooser on some devices.
                return
            }

            // Handler responded but no valid image selected (cancel/fail).
            // Keep strict gallery-only behavior by not opening browser chooser.
            return
        }

        // Fallback: browser picker is generally reliable across Android/iOS/Web.
        openTransientImageInput({
            onSelectFile,
            accept: "image/png, image/jpeg, image/jpg, image/webp",
        })
    } catch (error) {
        console.error("Gallery pick failed:", error)
        toast.error("Failed to open gallery")
    }
}