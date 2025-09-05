import React, {useEffect, useState} from 'react';
import axios from "axios";
import Swal from "sweetalert2";

// 1. Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';

// 2. Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import '../styles/Home.css'; // Your dedicated CSS file
import { FaWhatsapp } from 'react-icons/fa';

interface InfoItem {
    _id?: string; // Optional for initial data, assuming API provides it
    title: string;
    content: string;
    imageUrl: string;
    ctaLink?: string; // Optional: for a "Call to Action" button
    ctaText?: string; // Optional: text for the CTA button
}

const Home: React.FC = () => {

    const infoItemsInnit = [
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
                // console.log('response', response.data);
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

            <Swiper
                effect={'coverflow'}
                grabCursor={true}
                centeredSlides={true}
                loop={infoItems.length > 2}
                slidesPerView={'auto'}
                coverflowEffect={{
                    rotate: 50,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows: false,
                }}
                autoplay={{
                    delay: 3000,
                    disableOnInteraction: false,
                }}
                pagination={{ clickable: true }}
                navigation={true}
                modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
                className="mySwiper"
            >
                {infoItems.map((item, index) => (
                    <SwiperSlide key={item._id || index} style={{ backgroundImage: `url(${item.imageUrl})` }} />
                ))}
            </Swiper>

            {/* Sección de Información de Contacto */}
            <div style={{
                textAlign: 'center',
                padding: '10px',
                marginTop: '20px',
                marginBottom: '20px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9'
            }}>
                <h5 style={{ marginTop: 0, color: '#1621cc' }}>📱 Información de Contacto</h5>
                <p style={{ margin: '10px 0' }}>
                    Para consultas y reservas, contáctanos directamente por WhatsApp:
                </p>
                <p style={{ margin: '5px 0' }}>
                    <b>Ricardo Said:</b> <a href="https://wa.me/56989622137" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px' }}><FaWhatsapp style={{ color: 'green' }} /> +56 9 8962 2137</a>
                </p>
                <p style={{ margin: '5px 0' }}>
                    <b>Administrador App:</b> <a href="https://wa.me/56981914285" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px' }}><FaWhatsapp style={{ color: 'green' }} /> +56 9 8191 4285</a>
                </p>
            </div>
        </div>
    );
};

export default Home;