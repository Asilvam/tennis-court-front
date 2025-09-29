import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import '../styles/PlayerProfile.css';
import logger from "../utils/logger.ts";
import {getUserInfoFromLocalStorage} from "../utils/userUtils.ts";

interface PlayerProfileData {
    namePlayer: string;
    email: string;
    category: string;
    points: number;
    imageUrlProfile?: string;
}

const PlayerProfile: React.FC = () => {
    const userInfo = getUserInfoFromLocalStorage();
    const emailPlayer = userInfo?.email || '';
    const [player, setPlayer] = useState<PlayerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>('/images/profile-avatar.png');
    const [uploading, setUploading] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;
    // const cloudinaryUrl = import.meta.env.VITE_CLOUDINARY_URL;
    // const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    useEffect(() => {
        const fetchPlayerData = async () => {
            try {
                // Asumimos que tienes un endpoint protegido que devuelve los datos del usuario logueado
                const response = await axios.get<PlayerProfileData>(`${apiUrl}/register/profile/${emailPlayer}`);
                setPlayer(response.data);
                console.log(response.data);
                if (response.data.imageUrlProfile) {
                    setImagePreview(response.data.imageUrlProfile);
                }
            } catch (error) {
                logger.error("Error fetching player data:", error);
                Swal.fire('Error', 'No se pudo cargar la información del perfil.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchPlayerData();
    }, [apiUrl]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = async () => {
        if (!imageFile) {
            Swal.fire('Atención', 'Por favor, selecciona una imagen primero.', 'warning');
            return;
        }
        // if (!cloudinaryUrl || !cloudinaryUploadPreset) {
        //     logger.error("Cloudinary environment variables are not set.");
        //     Swal.fire('Error de Configuración', 'La funcionalidad de subida de imágenes no está configurada.', 'error');
        //     return;
        // }

        setUploading(true);

        const formData = new FormData();
        formData.append('image', imageFile);
        // formData.append('upload_preset', cloudinaryUploadPreset);

        try {
            // 1. Subir a Cloudinary
            const cloudinaryResponse = await axios.post(`${apiUrl}/register/profile`, formData);
            const imageUrlProfile = cloudinaryResponse.data.imageUrl;

            // 2. Actualizar el perfil en tu backend
            await axios.patch(`${apiUrl}/register/${emailPlayer}`, { imageUrlProfile });

            setPlayer(prev => prev ? { ...prev, profileImageUrl: imageUrlProfile } : null);
            Swal.fire('¡Éxito!', 'Tu foto de perfil ha sido actualizada.', 'success');
            setImageFile(null);
        } catch (error) {
            logger.error("Error uploading image:", error);
            Swal.fire('Error', 'Hubo un problema al subir tu imagen. Intenta de nuevo.', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="container center-align" style={{padding: "50px"}}><FontAwesomeIcon icon={faSpinner} spin size="3x" /></div>;
    }

    if (!player) {
        return <div className="container center-align" style={{padding: "50px"}}>No se encontró información del jugador.</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-image-wrapper">
                        <img src={imagePreview || '/images/fantasma-avatar.png'} alt="Perfil" className="profile-image" />
                        <label htmlFor="file-upload" className="edit-icon">
                            <FontAwesomeIcon icon={faPenToSquare} />
                        </label>
                        <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                    </div>
                    <h2>{player.namePlayer}</h2>
                    <p className="player-email">{player.email}</p>
                </div>

                <div className="profile-stats">
                    <div className="stat-item">
                        <span className="stat-label">Categoría</span>
                        <span className="stat-value">{player.category || 'N/A'}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Puntos</span>
                        <span className="stat-value">{player.points}</span>
                    </div>
                </div>

                {imageFile && (
                    <div className="upload-section">
                        <button onClick={handleImageUpload} disabled={uploading} className="btn blue darken-4">
                            {uploading ? <><FontAwesomeIcon icon={faSpinner} spin /> Subiendo...</> : 'Guardar Foto'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerProfile;