import SplashScreen from './pages/SplashScreen';
import Game from './pages/Game';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Shop from './pages/Shop';


export const PAGES = {
    "SplashScreen": SplashScreen,
    "Game": Game,
    "Home": Home,
    "Dashboard": Dashboard,
    "Shop": Shop,
}

export const pagesConfig = {
    mainPage: "SplashScreen",
    Pages: PAGES,
};