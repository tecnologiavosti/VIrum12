import { CreditCard, Settings, Users, LayoutDashboard, LogOut, Images, DollarSign, Ticket, Share2, Newspaper, ImagePlus, Activity, Search, ClipboardList, Package } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const items = [
  { title: 'Visão Geral', url: '/admin', icon: LayoutDashboard },
  { title: 'Financeiro', url: '/admin/finance', icon: DollarSign },
  { title: 'Usuários', url: '/admin/users', icon: Users },
  { title: 'Diagnósticos', url: '/admin/diagnoses', icon: ClipboardList },
  { title: 'Planos', url: '/admin/plans', icon: CreditCard },
  { title: 'Cupons', url: '/admin/coupons', icon: Ticket },
  { title: 'Afiliados', url: '/admin/affiliates', icon: Share2 },
  { title: 'Produtos Afiliados', url: '/admin/affiliate-products', icon: Package },
  { title: 'Biblioteca', url: '/admin/library', icon: Images },

  { title: 'Imagens do Formulário', url: '/admin/diagnostic-form-images', icon: ImagePlus },
  { title: 'Blog', url: '/admin/blog', icon: Newspaper },
  { title: 'Monitoramento de IA', url: '/admin/ai-monitoring', icon: Activity },
  { title: 'SEO', url: '/admin/seo', icon: Search },
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && 'Sair'}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
