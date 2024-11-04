import React, {useEffect, useState} from 'react';
import 'react-responsive-carousel/lib/styles/carousel.min.css'; // Carousel styles
import {Carousel} from 'react-responsive-carousel';

const Home: React.FC = () => {

    const [showInfo, setShowInfo] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowInfo(false);
        }, 6000); // Show for 3 seconds

        return () => clearTimeout(timer);
    }, []);
    const infoItems = [
        {
            title: "informacion de contacto",
            content: "Telefono: +56912345678, Direccion: Tennis Club, Main Street 123",
            imageUrl: "/images/contact-info.jpg"
        },
        // {
        //     title: "Court Schedulers",
        //     content: "Use our app to schedule your court times!",
        //     imageUrl: "/images/court-scheduler.jpg"
        // },
        // {
        //     title: "Player Rankings",
        //     content: "Don't forget to update your ranking after each match.",
        //     imageUrl: "/images/player-rankings.jpg"
        // } ,
        {
            title: "Copa Davis",
            content: "Gracias a todos los que participaron",
            imageUrl: "/images/tennis-club.jpeg"
        }
    ];

    return (
        <div>
            <h4 style={{textAlign: 'center', margin: '20px 0'}}>Club de tenis Quintero</h4>
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
                                height: '400px',
                                objectFit: 'cover',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: -1 // Send the image behind the text
                            }}
                        />
                        <div style={{
                            textAlign: 'center',
                            marginTop: '150px',
                            color: '#fff',
                            backgroundColor: '#000',
                            padding: '20px',
                            borderRadius: '5px'
                        }}> {/* Background added for contrast */}
                            <h2 style={{margin: '0', fontSize: '24px'}}>{item.title}</h2> {/* Font size adjustment */}
                            <p style={{margin: '0', fontSize: '16px'}}>{item.content}</p> {/* Font size adjustment */}
                        </div>
                    </div>
                ))}
            </Carousel>

            {showInfo && (
                <div style={{
                    backgroundColor: '#ffeb3b', // Flashy color
                    color: '#000',
                    padding: '10px',
                    textAlign: 'center',
                    marginTop: '20px',
                    fontSize: '18px',
                    animation: 'flash 2s', // Add flash effect
                    position: 'relative',
                    zIndex: 1
                }}>
                    Important: Please follow all club rules and respect others!
                </div>
            )}
        </div>
    );
};

export default Home;
