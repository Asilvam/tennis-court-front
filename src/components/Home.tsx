import React from 'react';
import 'react-responsive-carousel/lib/styles/carousel.min.css'; // Carousel styles
import {Carousel} from 'react-responsive-carousel';

const Home: React.FC = () => {
    const infoItems = [
        {
            title: "Contact Information",
            content: "Phone: +56912345678, Address: Tennis Club, Main Street 123",
            imageUrl: "/images/contact-info.jpg"
        },
        {
            title: "Court Schedulers",
            content: "Use our app to schedule your court times!",
            imageUrl: "/images/court-scheduler.jpg"
        },
        {
            title: "Player Rankings",
            content: "Don't forget to update your ranking after each match.",
            imageUrl: "/images/player-rankings.jpg"
        }
    ];

    return (
        <div>
            <h4 style={{textAlign: 'center', margin: '20px 0'}}>Welcome to Tennis Club</h4>
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
        </div>
    );
};

export default Home;
