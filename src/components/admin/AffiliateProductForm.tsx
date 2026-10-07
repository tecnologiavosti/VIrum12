import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AffiliateProduct } from '@/hooks/useAffiliateProducts';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Props {
  product?: AffiliateProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading?: boolean;
}

const STORES = ['Shopee', 'SHEIN', 'Amazon', 'Mercado Livre', 'Renner', 'C&A', 'Zara', 'Outra'];
const CATEGORIES = [
  'Camisa', 'Camiseta', 'Polo', 'Blazer', 'Jaqueta', 'Casaco', 'Calça', 'Bermuda', 
  'Shorts', 'Terno', 'Colete', 'Sapato', 'Tênis', 'Bota', 'Acessórios', 'Bolsa', 
  'Cinto', 'Relógio', 'Outro'
];
const BODY_TYPES = ['ampulheta', 'retângulo', 'pera', 'triângulo', 'triângulo invertido', 'oval'];
const STYLES = ['clássico', 'casual', 'social', 'elegante', 'minimalista', 'contemporâneo', 'streetwear', 'esportivo', 'sofisticado', 'executivo', 'urbano'];
const COLORS = ['preto', 'branco', 'azul', 'marrom', 'bege', 'cinza', 'verde', 'vermelho', 'vinho', 'neutros', 'tons terrosos', 'pastel'];
const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '38', '40', '42', '44', '46', 'Outro'];
const AUDIENCES = ['Masculino', 'Feminino', 'Unissex'];

export function AffiliateProductForm({ product, isOpen, onClose, onSave, isLoading }: Props) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: product || {
      name: '',
      store: '',
      category: '',
      subcategory: '',
      affiliate_url: '',
      image_url: '',
      price: 0,
      price_range: 'Médio',
      description: '',
      styles: [],
      body_types: [],
      colors: [],
      sizes: [],
      audience: 'Masculino',
      status: 'active'
    }
  });

  React.useEffect(() => {
    if (product) {
      reset(product);
    } else {
      reset({
        name: '',
        store: '',
        category: '',
        subcategory: '',
        affiliate_url: '',
        image_url: '',
        price: 0,
        price_range: 'Médio',
        description: '',
        styles: [],
        body_types: [],
        colors: [],
        sizes: [],
        audience: 'Masculino',
        status: 'active'
      });
    }
  }, [product, reset]);

  const onSubmit = (data: any) => {
    onSave(data);
  };

  const handleArrayToggle = (field: keyof AffiliateProduct, value: string) => {
    const current = watch(field as any) || [];
    if (current.includes(value)) {
      setValue(field as any, current.filter((v: string) => v !== value));
    } else {
      setValue(field as any, [...current, value]);
    }
  };

  const imageUrl = watch('image_url');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Informações Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input id="name" {...register('name', { required: true })} placeholder="Ex: Blazer Oversized Preto" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store">Loja *</Label>
                  <Select onValueChange={(val) => setValue('store', val)} defaultValue={product?.store}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select onValueChange={(val) => setValue('category', val)} defaultValue={product?.category}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Input id="subcategory" {...register('subcategory')} />
                </div>
              </div>

              {/* Link e Imagem */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="affiliate_url">Link de Afiliado *</Label>
                  <Input id="affiliate_url" {...register('affiliate_url', { required: true })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_url">URL da Imagem</Label>
                  <Input id="image_url" {...register('image_url')} placeholder="https://..." />
                  {imageUrl && (
                    <div className="mt-2 border rounded p-2 bg-muted/20 flex justify-center">
                      <img src={imageUrl} alt="Preview" className="h-32 object-contain" onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=Erro+Imagem')} />
                    </div>
                  )}
                </div>
              </div>

              {/* Preço e Faixa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input id="price" type="number" step="0.01" {...register('price', { required: true, valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_range">Faixa de Preço</Label>
                  <Select onValueChange={(val) => setValue('price_range', val)} defaultValue={product?.price_range || 'Médio'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Econômico', 'Médio', 'Premium', 'Luxo'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Características (Tags) */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Estilos</Label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map(s => (
                      <Badge 
                        key={s} 
                        variant={watch('styles')?.includes(s) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleArrayToggle('styles', s)}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipos Corporais</Label>
                  <div className="flex flex-wrap gap-2">
                    {BODY_TYPES.map(bt => (
                      <Badge 
                        key={bt} 
                        variant={watch('body_types')?.includes(bt) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleArrayToggle('body_types', bt)}
                      >
                        {bt}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cores</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <Badge 
                        key={c} 
                        variant={watch('colors')?.includes(c) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleArrayToggle('colors', c)}
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tamanhos</Label>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map(sz => (
                      <Badge 
                        key={sz} 
                        variant={watch('sizes')?.includes(sz) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleArrayToggle('sizes', sz)}
                      >
                        {sz}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Público e Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Público</Label>
                  <Select onValueChange={(val) => setValue('audience', val)} defaultValue={product?.audience || 'Masculino'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select onValueChange={(val: any) => setValue('status', val)} defaultValue={product?.status || 'active'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" {...register('description')} rows={3} />
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : product ? 'Atualizar Produto' : 'Cadastrar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
