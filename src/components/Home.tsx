import React, {useEffect, useState} from 'react';
import axios from "axios";
import Swal from "sweetalert2";
import ResultsTicker from './ResultsTicker';

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
import NewsTicker from "./NewsTicker.tsx";

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
            }
        } catch (error) {
            console.error('Error fetching carousel items:', error);
        }
    };

    useEffect(() => {
        const loadDataAndShowInfo = async () => {
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
            <h4 className="home-title">👋 Bienvenidos(as)</h4>
            {/*<ResultsTicker />*/}
            <NewsTicker />
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
            <div className="contact-card-home">
                <h5 className="contact-title">📱 Información de Contacto</h5>
                <p>
                    Para consultas y reservas, contáctanos directamente por WhatsApp:
                </p>
                <p>
                    <b>Ricardo Said:</b> <a href="https://wa.me/56989622137" target="_blank" rel="noopener noreferrer"><FaWhatsapp style={{ color: 'green' }} /> +56 9 8962 2137</a>
                </p>
                <p>
                    <b>Administrador App:</b> <a href="https://wa.me/56981914285" target="_blank" rel="noopener noreferrer"><FaWhatsapp style={{ color: 'green' }} /> +56 9 8191 4285</a>
                </p>
            </div>
        </div>
    );
};

export default Home;