import React, { useState, useRef } from "react";
import "cropperjs/dist/cropper.css";
import { Cropper } from "react-cropper";

function NewDelivery() {
    const [image, setImage] = useState(null); // Stores the selected image
    const cropperRef = useRef(null); // Ref for the cropper instance

    // Handles file selection
    const onSelectImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result); // Load image as base64
            };
            reader.readAsDataURL(file);
        }
    };

    // Get the cropped image
    const sendCroppedImage = async () => {
        const cropper = cropperRef.current.cropper;
        const croppedCanvas = cropper.getCroppedCanvas();
        const base64Image = croppedCanvas.toDataURL("image/jpeg");

        try {
            const response = await fetch("https://ovq83rc7jb.execute-api.eu-west-2.amazonaws.com/Prod/upload-invoice", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", // Corrected Content-Type
                },
                body: JSON.stringify({ image: base64Image.split(",")[1] }), // Ensure the body is JSON
            });

            const data = await response.json();
            if(response.status === 200) {
                console.log(data.invoiceId)
            }
            else if (response.status === 500) {
                throw new Error({response});
            }
        } catch (error) {
            console.error("Error uploading image:", error);
        }
    };


    return (
        <div>
            <h1>New Delivery</h1>
            {!image && (
                <input type="file" accept="image/*"  onChange={onSelectImage} />
            )}
            {image && (
                <div>
                    <Cropper
                        src={image} // Image to crop
                        style={{ height: 400, width: "100%" }}
                        initialAspectRatio={1}
                        guides={true} // Show grid lines for alignment
                        cropBoxMovable={true} // Allow moving the crop box
                        cropBoxResizable={true} // Allow resizing the crop box
                        ref={cropperRef} // Ref for cropper instance
                    />
                    <button onClick={sendCroppedImage}>Crop and send</button>
                </div>
            )}
        </div>
    );
}

export default NewDelivery;
