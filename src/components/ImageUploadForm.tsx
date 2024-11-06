import React, {Fragment, useState} from 'react';
import axios from 'axios';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

const ImageUploadForm: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [image, setImage] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');

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
                    title: 'Item Carrusel',
                    text: 'todo ok!',
                });
            }
            console.log(response);
            setResponseMessage(response.data.state);
        } catch (error) {
            setResponseMessage('Image upload failed.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Fragment>
            <div className="container">
                <h6>Imagen, Titulo y texto</h6>
                <form onSubmit={handleSubmit}>
                    <div className="input col s12">
                        <label>Select image:</label>
                        <input type="file" className="grey darken-1" style={{width: '100%', color: 'whitesmoke'}}
                               onChange={handleImageChange}/>
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
                    <div className="col s12" style={{marginTop: '20px'}}>
                        <button type="submit" className="btn blue darken-4" disabled={loading}>
                            {loading && <FontAwesomeIcon icon={faSpinner} spin fixedWidth/>} Upload
                        </button>
                        <a href="/" className="btn blue darken-1" style={{marginLeft: '15px'}}>
                            Cancelar
                        </a>
                    </div>
                </form>
                {responseMessage && <p>{responseMessage}</p>}
            </div>
        </Fragment>
    );
};

export default ImageUploadForm;
