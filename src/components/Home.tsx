import React, {useEffect, useState} from 'react';
import 'react-responsive-carousel/lib/styles/carousel.min.css'; // Carousel styles
import {Carousel} from 'react-responsive-carousel';
import axios from "axios";

interface InfoItem {
    title: string;
    content: string;
    imageUrl: string;
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

    const [showInfo, setShowInfo] = useState(true);
    const [infoItems, setInfoItems] = useState(infoItemsInnit);
    const [loading, setLoading] = useState<boolean>(true);
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowInfo(false);
        }, 6000); // Show for 3 seconds

        return () => clearTimeout(timer);
    }, []);

    // Fetch reserves data from the API
    const fetchItems = async () => {
        try {
            const response = await axios.get<InfoItem[]>(`${apiUrl}/info-items`); // Replace with actual endpoint
            setInfoItems(response.data);
        } catch (error) {
            console.error('Error fetching reserves:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    return loading ? (
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
        <div>
            <h4 style={{textAlign: 'center', margin: '20px 0', color:' #1621cc '}}>Bienvenidos(as)</h4>
            <Carousel autoPlay infiniteLoop showThumbs={false}>
                {infoItems.map((item, index) => (
                    <div key={index} style={{
                        height: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img
                            src={item.imageUrl}
                            alt={item.title}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'scale-down',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: -1 // Send the image behind the text
                            }}
                        />
                        <div style={{
                            textAlign: 'center',
                            marginTop: '150px',
                            color: '#1621cc',
                            backgroundColor: '#0fd7ff',
                            padding: '20px',
                            borderRadius: '4px'
                        }}> {/* Background added for contrast */}
                            <h2 style={{margin: '0', fontSize: '20px'}}>{item.title}</h2> {/* Font size adjustment */}
                            <p style={{margin: '0', fontSize: '12px'}}>{item.content}</p> {/* Font size adjustment */}
                        </div>
                    </div>
                ))}
            </Carousel>

            {showInfo && (
                <div style={{
                    backgroundColor: '#f5ff11', // Flashy color
                    color: '#1621cc',
                    padding: '10px',
                    textAlign: 'center',
                    marginTop: '20px',
                    fontSize: '18px',
                    animation: 'flash 2s', // Add flash effect
                    position: 'relative',
                    zIndex: 1
                }}>
                    Importante: Sino te gusta la wea LL se los pitea!
                </div>
            )}
        </div>
    );
};

export default Home;
