import { useState } from 'react';
import { useAdminAffiliateProducts, AffiliateProduct } from '@/hooks/useAffiliateProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AffiliateProductForm } from '@/components/admin/AffiliateProductForm';
import { Plus, Search, Edit2, Trash2, ExternalLink, MousePointerClick } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminAffiliateProducts() {
  const { products, saveProduct, deleteProduct, stats } = useAdminAffiliateProducts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AffiliateProduct | null>(null);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProducts = products.data?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStore = storeFilter === 'all' || p.store === storeFilter;
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesStore && matchesCategory;
  }) || [];

  const handleEdit = (product: AffiliateProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteProduct.mutateAsync(id);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos Afiliados</h1>
          <p className="text-muted-foreground">Gerencie recomendações de lojas externas</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">{stats.data?.activeProducts || 0} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Cliques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.totalClicks || 0}</div>
            <div className="flex items-center text-xs text-green-500 mt-1">
              <MousePointerClick className="w-3 h-3 mr-1" />
              {stats.data?.clicksToday || 0} hoje
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Loja Principal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.topStore || '—'}</div>
            <p className="text-xs text-muted-foreground">Mais acessada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produto Destaque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {filteredProducts.sort((a,b) => b.click_count - a.click_count)[0]?.name || '—'}
            </div>
            <p className="text-xs text-muted-foreground">Maior performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar produto..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select onValueChange={setStoreFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {['Shopee', 'SHEIN', 'Amazon', 'Mercado Livre', 'Renner', 'C&A', 'Zara'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setCategoryFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {['Camisa', 'Blazer', 'Calça', 'Sapato', 'Acessórios'].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Cliques</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Nenhum produto encontrado.</TableCell></TableRow>
            ) : filteredProducts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <img src={p.image_url || 'https://placehold.co/40x40'} className="w-10 h-10 rounded object-cover border" alt="" />
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.store}</TableCell>
                <TableCell>{formatPrice(p.price)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {p.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-center">{p.click_count || 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(p.created_at), 'dd/MM/yy', { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <a href={p.affiliate_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AffiliateProductForm 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct}
        onSave={(data) => {
          saveProduct.mutate(data, { onSuccess: () => setIsModalOpen(false) });
        }}
        isLoading={saveProduct.isPending}
      />
    </div>
  );
}
