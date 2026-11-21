import { BarChart3, BellRing, Building2, Clapperboard, FileText, Inbox, LayoutDashboard, LineChart, Megaphone, Package, Palette, Rocket, Search, Settings, ShoppingBag, ShoppingCart, Sparkles, Store, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; badge?: string }
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Sell everywhere", items: [
    { href: "/launch", label: "One-Click Launch", icon: Rocket },
    { href: "/channels", label: "Channels & stock", icon: Store },
    { href: "/search", label: "Search Everywhere", icon: Search },
    { href: "/orders", label: "Orders & money", icon: Wallet },
    { href: "/alerts", label: "Alerts & offers", icon: BellRing },
  ] },
  { group: "Intelligence", items: [
    { href: "/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/ai", label: "AI Intelligence Center", icon: Sparkles },
  ] },
  { group: "Marketplaces", items: [
    { href: "/marketplaces/amazon", label: "Amazon", icon: ShoppingCart },
    { href: "/marketplaces/flipkart", label: "Flipkart", icon: ShoppingBag },
  ] },
  { group: "Advertising", items: [
    { href: "/meta-ads", label: "Meta Ads", icon: Megaphone },
    { href: "/advertising", label: "Advertising Analytics", icon: BarChart3 },
    { href: "/studio", label: "Creative Studio", icon: Palette },
    { href: "/studio/reel", label: "Reel maker", icon: Clapperboard },
  ] },
  { group: "Commerce", items: [
    { href: "/sales", label: "Sales Analytics", icon: LineChart },
    { href: "/products", label: "Products", icon: Package },
  ] },
  { group: "Agency", items: [
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/clients", label: "Clients", icon: Building2 },
    { href: "/leads", label: "Website leads", icon: Inbox },
    { href: "/settings", label: "Settings", icon: Settings },
  ] },
];

/** The presentation sequence from the demo script. */
export const TOUR = [
  { href: "/launch", title: "One-Click Launch", note: "Add a product once, seller approves, one click sends it everywhere" },
  { href: "/overview", title: "Business overview", note: "Consolidated marketplace and advertising health" },
  { href: "/marketplaces/amazon", title: "Marketplace intelligence", note: "Amazon and Flipkart sales, products, inventory" },
  { href: "/meta-ads", title: "Advertising intelligence", note: "Meta campaigns, spend, conversions, ROAS" },
  { href: "/ai", title: "AI recommendations", note: "Opportunities and problems found in the data" },
  { href: "/studio", title: "Creative Studio", note: "Edit an ad creative from a template" },
  { href: "/reports", title: "Reports", note: "Generate and export a business report" },
  { href: "/clients", title: "Client management", note: "Run several clients from one workspace" },
];
