import {
  FiHome, FiGrid, FiPackage, FiUsers, FiSettings,
  FiFileText, FiShoppingCart, FiMail, FiStar, FiInfo, FiLink,
} from 'react-icons/fi'

export function getIcon(id: string, size = 14) {
  const map: Record<string, React.ReactNode> = {
    FiHome:         <FiHome         size={size} />,
    FiGrid:         <FiGrid         size={size} />,
    FiPackage:      <FiPackage      size={size} />,
    FiUsers:        <FiUsers        size={size} />,
    FiSettings:     <FiSettings     size={size} />,
    FiFileText:     <FiFileText     size={size} />,
    FiShoppingCart: <FiShoppingCart size={size} />,
    FiMail:         <FiMail         size={size} />,
    FiStar:         <FiStar         size={size} />,
    FiInfo:         <FiInfo         size={size} />,
  }
  return map[id] ?? <FiLink size={size} />
}