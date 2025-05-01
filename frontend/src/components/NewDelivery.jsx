import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePageHeading } from "./PageHeadingContext";
import { Cropper } from "react-cropper";
import "cropperjs/dist/cropper.css";
import "../styles/NewDelivery.css";
import "../styles/MainMenu.css";
import InvoiceReviewForm from "./InvoiceReviewForm";

import galleryIcon from "/assets/gallery_icon.png";
import cameraIcon from "/assets/camera_icon.png";

import { uploadInvoice, getInvoiceStatus, recordDelivery } from "../utils/api";

function NewDelivery() {
    const { setPageHeading } = usePageHeading();
    const navigate = useNavigate();

    useEffect(() => {
        setPageHeading("Record a new delivery:");
    }, [setPageHeading]);

    const [image, setImage] = useState(null);
    const [invoiceID, setInvoiceID] = useState(null);
    const [processingStatus, setProcessingStatus] = useState(null);
    const [matchedItems, setMatchedItems] = useState(null);
    const [inventoryList, setInventoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const cropperRef = useRef(null);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const onSelectImage = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const pollInterval = useRef(null);

    useEffect(() => {
        if (!invoiceID) return;

        const fetchStatus = async () => {
            try {
                const data = await getInvoiceStatus(invoiceID);
                setProcessingStatus(data.status);

                if (data.status === 4) {
                    setMatchedItems(data.matchedItems);
                    setInventoryList(data.inventoryList || []);
                    clearInterval(pollInterval.current);
                    setPageHeading("Record a new delivery: review and confirm items");
                }
            } catch (error) {
                console.error("Error fetching invoice status:", error);
            }
        };

        pollInterval.current = setInterval(fetchStatus, 3000);
        fetchStatus();

        return () => clearInterval(pollInterval.current);
    }, [invoiceID]);

    const sendCroppedImage = async () => {
        if (!cropperRef.current) return;
        const cropper = cropperRef.current.cropper;
        const croppedCanvas = cropper.getCroppedCanvas();
        const base64Image = croppedCanvas.toDataURL("image/jpeg");
        setIsLoading(true);
        try {
            const data = await uploadInvoice(base64Image.split(",")[1]);
            setInvoiceID(data.InvoiceID);
            setProcessingStatus(0);
        } catch (error) {
            console.error("Error uploading image:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = async (finalData) => {
        setIsLoading(true);
        try {
            const data = await recordDelivery({
                invoiceId: invoiceID,
                matchedItems: finalData,
            });
            console.log('Delivery recorded:', data);
            navigate('/', { state: { showToast: true } });
        } catch (error) {
            console.error('Error submitting delivery:', error);
            alert('Failed to record delivery. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main>
            {!image && !invoiceID && (
                <div className="newDelivery-buttonContainer">
                    <button className="action-button newDelivery-button" onClick={() => cameraInputRef.current.click()}>
                        <img src={cameraIcon} className="icon" />
                        Take a photo
                    </button>
                    <button className="action-button newDelivery-button" onClick={() => fileInputRef.current.click()}>
                        <img src={galleryIcon} className="icon" />
                        Select a photo
                    </button>
                </div>
            )}

            {image && !invoiceID && (
                <div className="cropperPageContainer">
                    <div className="cropperWrapper">
                        <Cropper
                            src={image}
                            style={{ height: "100%" }}
                            initialAspectRatio={1}
                            guides={true}
                            cropBoxMovable={true}
                            cropBoxResizable={true}
                            ref={cropperRef}
                            ready={() => {
                                const cropper = cropperRef.current?.cropper;
                                if (cropper) {
                                    const imageData = cropper.getImageData();
                                    const containerData = cropper.getContainerData();

                                    const left = containerData.width / 2 - imageData.width / 2;
                                    const top = containerData.height / 2 - imageData.height / 2;

                                    cropper.setCanvasData({
                                        left: left,
                                        top: top,
                                        width: imageData.width,
                                        height: imageData.height,
                                    });

                                    const cropBoxWidth = imageData.width;
                                    const cropBoxHeight = imageData.height;
                                    const canvasData = cropper.getCanvasData();

                                    cropper.setCropBoxData({
                                        left: canvasData.left + (canvasData.width - cropBoxWidth) / 2,
                                        top: canvasData.top + (canvasData.height - cropBoxHeight) / 2,
                                        width: cropBoxWidth,
                                        height: cropBoxHeight,
                                    });
                                }
                            }}
                        />
                    </div>
                    <div className="newDelivery-buttonCropWrapper">
                        <button className="newDelivery-buttonCrop" onClick={sendCroppedImage}>
                            Crop and Send
                        </button>
                    </div>
                </div>
            )}

            {invoiceID && processingStatus < 4 && (
                <div className="newDelivery-status">
                    <h2>Processing Status: {processingStatus === null ? "Waiting..." : processingStatus+"/4"}</h2>
                </div>
            )}

            {invoiceID && processingStatus === 4 && matchedItems && (
                <InvoiceReviewForm
                    matchedItems={matchedItems}
                    inventoryList={inventoryList}
                    onSubmit={handleFormSubmit}
                />
            )}

            <input type="file" accept="image/*" ref={fileInputRef} className="newDelivery-hiddenFile" onChange={onSelectImage} />
            <input type="file" accept="image/*" capture="camera" ref={cameraInputRef} className="newDelivery-hiddenFile" onChange={onSelectImage} />

            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner" />
                </div>
            )}
        </main>
    );
}

export default NewDelivery;