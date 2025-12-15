import SplashScreen from './pages/SplashScreen';
import Game from './pages/Game';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Shop from './pages/Shop';
import Encyclopedia from './pages/Encyclopedia';
import Breeding from './pages/Breeding';
import LoreArchive from './pages/LoreArchive';
import ResearchTree from './pages/ResearchTree';
import PlantUpgrades from './pages/PlantUpgrades';
import Crafting from './pages/Crafting';


export const PAGES = {
    "SplashScreen": SplashScreen,
    "Game": Game,
    "Home": Home,
    "Dashboard": Dashboard,
    "Shop": Shop,
    "Encyclopedia": Encyclopedia,
    "Breeding": Breeding,
    "LoreArchive": LoreArchive,
    "ResearchTree": ResearchTree,
    "PlantUpgrades": PlantUpgrades,
    "Crafting": Crafting,
}

export const pagesConfig = {
    mainPage: "SplashScreen",
    Pages: PAGES,
};