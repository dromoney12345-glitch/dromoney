export const isFlutterBridgeAvailable = () => {
    return typeof window !== 'undefined' && window.flutter_inappwebview !== undefined;
};

export const convertBase64ToFile = (base64String, mimeType = "image/jpeg", prefix = "file", originalName = "") => {
    try {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const fileName = originalName || `${prefix}-${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;
        return new File([blob], fileName, { type: mimeType });
    } catch (e) {
        console.error("Base64 conversion failed", e);
        return null;
    }
};

export const openGallery = async ({ onSelectFile, fileNamePrefix = "gallery-photo" }) => {
    try {
        if (isFlutterBridgeAvailable()) {
            const result = await window.flutter_inappwebview.callHandler("openGallery", {
                source: "gallery",
                accept: "image/png, image/jpeg, image/jpg, image/webp",
                multiple: false,
            });

            const isSuccess =
                result?.success === true ||
                Boolean(result?.base64 || result?.base64String || result?.data?.base64);

            if (result && isSuccess) {
                let selectedFile = null;
                const base64Value = result?.base64 || result?.base64String || result?.data?.base64;
                const mimeType = result?.mimeType || result?.type || result?.data?.mimeType || "image/jpeg";
                const originalFileName = result?.fileName || result?.name || result?.data?.fileName || "";

                if (base64Value) {
                    selectedFile = convertBase64ToFile(
                        base64Value,
                        mimeType,
                        fileNamePrefix,
                        originalFileName
                    );
                } else if (result.file instanceof File || result.file instanceof Blob) {
                    selectedFile = result.file;
                }

                if (selectedFile && String(selectedFile.type || "").startsWith("image/")) {
                    onSelectFile(selectedFile);
                }
                return;
            }
            return;
        }

        // Native browser fallback implementation without requiring external files
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png, image/jpeg, image/jpg, image/webp';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                onSelectFile(file);
            }
        };
        input.click();

    } catch (error) {
        console.error("Gallery pick failed:", error);
    }
};