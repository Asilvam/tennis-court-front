import React, { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

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
    const [responseMessage, setResponseMessage] = useState('');
    const [items, setItems] = useState<Item[]>([]);

    // Fetch the list of uploaded items
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
            alert('Please fill in all fields and upload an image.');
            return;
        }
        setLoading(true);
        const formData = new FormData();
        formData.append('image', image);
        formData.append('title', title);
        formData.append('text', text);

        try {
            const response = await axios.post(`${apiUrl}/info-items/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.status === 200 || response.status === 201) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Carrusel',
                    text: 'Item agregado con éxito!',
                });
                fetchItems(); // Refresh the list after upload
                setTitle('');
                setText('');
                setImage(null);
            }
            setResponseMessage(response.data.state);
        } catch (error) {
            setResponseMessage('Image upload failed.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        console.log(itemId);
        const confirm = await Swal.fire({
            title: 'Are you sure?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        });

        if (confirm.isConfirmed) {
            try {
                await axios.delete(`${apiUrl}/info-items/${itemId}`);
                setItems((prev) => prev.filter((item) => item._id !== itemId));
                Swal.fire('Deleted!', 'The item has been deleted.', 'success');
            } catch (error) {
                console.error('Error deleting item:', error);
                Swal.fire('Error', 'Failed to delete the item.', 'error');
            }
        }
    };

    return fetchLoading ? (
        <div className="preloader-wrapper active">
            <div className="spinner-layer spinner-blue-only">
                <div className="circle-clipper left">
                    <div className="circle"></div>
                </div>
                <div className="gap-patch">
                    <div className="circle"></div>
                </div>
                <div className="circle-clipper right">
                    <div className="circle"></div>
                </div>
            </div>
        </div>
    ) :(
        <Fragment>
            <div className="container">
                <h6>Carrusel Imagen, Titulo y texto</h6>
                <form onSubmit={handleSubmit}>
                    <div className="input col s12">
                        <label>Select image:</label>
                        <input type="file" className="grey darken-1" style={{ width: '100%', color: 'whitesmoke' }}
                               onChange={handleImageChange} />
                    </div>
                    <div>
                        <label>Title:</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter the title"
                        />
                    </div>
                    <div>
                        <label>Text:</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter the text"
                        />
                    </div>
                    <div className="col s12" style={{ marginTop: '20px' }}>
                        <button type="submit" className="btn blue darken-4" disabled={loading}>
                            {loading && <FontAwesomeIcon icon={faSpinner} spin fixedWidth />} Upload
                        </button>
                        <a href="/" className="btn blue darken-1" style={{ marginLeft: '15px' }}>
                            Cancelar
                        </a>
                    </div>
                </form>
                {responseMessage && <p>{responseMessage}</p>}
                <h6 className="mt-4">Uploaded Items</h6>
                <table className="striped">
                    <thead>
                    <tr>
                        <th>Title</th>
                        <th>Image</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map((item) => (
                        <tr key={item._id}>
                            <td>{item.title}</td>
                            <td>
                                <img src={item.imageUrl} alt={item.title} width={50} />
                            </td>
                            <td>
                                <button onClick={() => handleDelete(item._id)} className="btn btn-danger blue darken-1">
                                    <FontAwesomeIcon icon={faTrash} /> Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </Fragment>
    );
};

export default ImageUploadForm;
