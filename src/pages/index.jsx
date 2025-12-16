import Layout from "./Layout.jsx";

import SplashScreen from "./SplashScreen";

import Game from "./Game";

import Home from "./Home";

import Dashboard from "./Dashboard";

import Shop from "./Shop";

import Encyclopedia from "./Encyclopedia";

import Breeding from "./Breeding";

import LoreArchive from "./LoreArchive";

import ResearchTree from "./ResearchTree";

import PlantUpgrades from "./PlantUpgrades";

import Crafting from "./Crafting";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    SplashScreen: SplashScreen,
    
    Game: Game,
    
    Home: Home,
    
    Dashboard: Dashboard,
    
    Shop: Shop,
    
    Encyclopedia: Encyclopedia,
    
    Breeding: Breeding,
    
    LoreArchive: LoreArchive,
    
    ResearchTree: ResearchTree,
    
    PlantUpgrades: PlantUpgrades,
    
    Crafting: Crafting,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<SplashScreen />} />
                
                
                <Route path="/SplashScreen" element={<SplashScreen />} />
                
                <Route path="/Game" element={<Game />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Shop" element={<Shop />} />
                
                <Route path="/Encyclopedia" element={<Encyclopedia />} />
                
                <Route path="/Breeding" element={<Breeding />} />
                
                <Route path="/LoreArchive" element={<LoreArchive />} />
                
                <Route path="/ResearchTree" element={<ResearchTree />} />
                
                <Route path="/PlantUpgrades" element={<PlantUpgrades />} />
                
                <Route path="/Crafting" element={<Crafting />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}