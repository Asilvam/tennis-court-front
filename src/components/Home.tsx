import React, {useEffect, useState} from 'react';
import 'react-responsive-carousel/lib/styles/carousel.min.css'; // Carousel styles
import {Carousel} from 'react-responsive-carousel';
import '../styles/Home.css'; // Import a dedicated CSS file for styling
import axios from "axios";
import Swal from "sweetalert2";

interface InfoItem {
    title: string;
    content: string;
    imageUrl: string;
    ctaLink?: string; // Optional: for a "Call to Action" button
    ctaText?: string; // Optional: text for the CTA button
}

const Home: React.FC = () => {

    const infoItemsInnit = [
        {
            title: "informacion de contacto",
            content: "Miguel Vega administrador Telefono: +56912345678, Direccion: Avenida Normandie S/N",
            imageUrl: "/images/logo-club.jpg"
        },
        {
            title: "Copa Davis 2024",
            content: "Gracias a todos los que participaron",
            imageUrl: "/images/tennis-club.jpeg"
        }
    ];

    const [infoItems, setInfoItems] = useState(infoItemsInnit);
    const apiUrl = import.meta.env.VITE_API_URL;

    const fetchItems = async () => {
        try {
            const response = await axios.get<InfoItem[]>(`${apiUrl}/info-items`);
            if (response.data && response.data.length > 0) {
                setInfoItems(response.data);
            }
        } catch (error) {
            console.error('Error fetching carousel items:', error);
            // Fallback to initial items if API fails
        }
    };

    useEffect(() => {
        const loadDataAndShowInfo = async () => {
            // 1. Show a loading indicator while fetching data
            await Swal.fire({
                title: 'Cargando...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                    fetchItems().then(() => {
                        Swal.close();
                    });
                }
            });

        };

        loadDataAndShowInfo();
    }, []);

    return (
        <div className="container">
            <h4 style={{textAlign: 'center', margin: '40px 0 20px 0', color:' #1621cc '}}>👋 Bienvenidos(as)</h4>

            <Carousel autoPlay infiniteLoop showThumbs={false}>
                {infoItems.map((item, index) => (
                    <div
                        key={index}
                        className="carousel-slide"
                        style={{ backgroundImage: `url(${item.imageUrl})` }}
                    >
                        {/* El contenido de texto (título, párrafo, botón) ha sido removido para mostrar solo la imagen. */}
                    </div>
                ))}
            </Carousel>

            {/* Sección de Información de Contacto */}
            <div style={{
                textAlign: 'center',
                padding: '20px',
                marginTop: '20px',
                marginBottom: '40px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9'
            }}>
                <h5 style={{ marginTop: 0, color: '#1621cc' }}>📱 Información de Contacto</h5>
                <p style={{ margin: '10px 0' }}>
                    Para consultas y reservas, contáctanos directamente por WhatsApp:
                </p>
                <p style={{ margin: '5px 0' }}>
                    <b>Miguel Vega:</b> <a href="https://wa.me/56974024351" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px' }}>+56 9 7402 4351</a>
                </p>
                <p style={{ margin: '5px 0' }}>
                    <b>Ricardo Said:</b> <a href="https://wa.me/56989622137" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px' }}>+56 9 8962 2137</a>
                </p>
            </div>
        </div>
    );
};

export default Home;