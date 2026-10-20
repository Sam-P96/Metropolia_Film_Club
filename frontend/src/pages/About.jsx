import AboutClub from '../components/about/AboutClub';
import AboutIntro from '../components/about/AboutIntro';

function About({ isAuthenticated }) {
    return (
        <div>
            
            <AboutIntro />
            <AboutClub isAuthenticated={isAuthenticated} />
        </div>
    )
};

export default About;