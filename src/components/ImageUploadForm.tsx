import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTrash, faImages, faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import AppLoader from './AppLoader';
import '../styles/ImageUploadForm.css';

interface Item {
    _id: string;
    title: string;
    text: string;
    imageUrl: string;
}

const ImageUploadForm: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [image, setImage] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [items, setItems] = useState<Item[]>([]);

    const fetchItems = async () => {
        try {
            const response = await axios.get(`${apiUrl}/info-items`);
            setItems(response.data);
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImage(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image || !title || !text) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor completa todos los campos y selecciona una imagen.',
            });
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('image', image);
        formData.append('title', title);
        formData.append('text', text);

        try {
            const response = await axios.post(`${apiUrl}/info-items/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.status === 200 || response.status === 201) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Carrusel',
                    text: 'Item agregado con éxito.',
                });
                fetchItems();
                setTitle('');
                setText('');
                setImage(null);
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo subir el item. Intenta nuevamente.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar item?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (confirm.isConfirmed) {
            try {
                await axios.delete(`${apiUrl}/info-items/${itemId}`);
                setItems((prev) => prev.filter((item) => item._id !== itemId));
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El item fue eliminado correctamente.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            } catch (error) {
                console.error('Error deleting item:', error);
                Swal.fire('Error', 'No se pudo eliminar el item.', 'error');
            }
        }
    };

    if (fetchLoading) {
        return <AppLoader text="Cargando carrusel..." />;
    }

    return (
        <div className="iuf-container">

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <div className="iuf-hero">
                <div className="iuf-hero-text">
                    <h4>Carrusel de Imágenes</h4>
                    <p>Administra el contenido visual de la página de inicio.</p>
                </div>
                <div className="iuf-hero-badge">
                    <FontAwesomeIcon icon={faImages} />
                    <span>{items.length} items</span>
                </div>
            </div>

            {/* ── Upload form ────────────────────────────────────────────── */}
            <div className="iuf-card">
                <p className="iuf-card-title">Agregar nuevo item</p>

                <form className="iuf-form" onSubmit={handleSubmit}>

                    {/* File zone */}
                    <div className="iuf-field">
                        <span className="iuf-label">Imagen</span>
                        <div className={`iuf-file-zone ${image ? 'has-file' : ''}`}>
                            <input
                                type="file"
                                accept="image/*"
                                className="iuf-file-input"
                                onChange={handleImageChange}
                            />
                            <div className="iuf-file-icon">
                                <FontAwesomeIcon icon={faCloudUploadAlt} />
                            </div>
                            <span className="iuf-file-label">
                                {image ? image.name : 'Haz clic para seleccionar imagen'}
                            </span>
                            <span className="iuf-file-hint">
                                {image ? `${(image.size / 1024).toFixed(0)} KB` : 'JPG, PNG, WEBP · máx. 10 MB'}
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="iuf-field">
                        <label className="iuf-label" htmlFor="iuf-title">Título</label>
                        <input
                            id="iuf-title"
                            type="text"
                            className="iuf-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Torneo de Verano"
                        />
                    </div>

                    {/* Text / caption */}
                    <div className="iuf-field">
                        <label className="iuf-label" htmlFor="iuf-text">Descripción</label>
                        <input
                            id="iuf-text"
                            type="text"
                            className="iuf-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Ej: Inscríbete antes del 30 de enero"
                        />
                    </div>

                    {/* Actions */}
                    <div className="iuf-actions">
                        <button
                            type="button"
                            className="iuf-btn-cancel"
                            onClick={() => { setTitle(''); setText(''); setImage(null); }}
                            disabled={loading}
                        >
                            Limpiar
                        </button>
                        <button
                            type="submit"
                            className="iuf-btn-submit"
                            disabled={loading}
                        >
                            {loading
                                ? <><FontAwesomeIcon icon={faSpinner} spin /> Subiendo...</>
                                : <><FontAwesomeIcon icon={faCloudUploadAlt} /> Subir item</>
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Items table ────────────────────────────────────────────── */}
            <div className="iuf-card">
                <p className="iuf-card-title">Items publicados</p>

                {items.length === 0 ? (
                    <div className="iuf-empty">
                        <FontAwesomeIcon icon={faImages} style={{ fontSize: '2rem', color: '#cbd5e1' }} />
                        <p>No hay items en el carrusel.</p>
                    </div>
                ) : (
                    <div className="iuf-table-wrapper">
                        <table className="iuf-table">
                            <thead>
                                <tr>
                                    <th>Imagen</th>
                                    <th>Título</th>
                                    <th>Descripción</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item._id}>
                                        <td>
                                            <img
                                                src={item.imageUrl}
                                                alt={item.title}
                                                className="iuf-thumb"
                                            />
                                        </td>
                                        <td className="iuf-title-cell">{item.title}</td>
                                        <td>{item.text}</td>
                                        <td>
                                            <button
                                                className="iuf-btn-delete"
                                                onClick={() => handleDelete(item._id)}
                                                title="Eliminar item"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUploadForm;
