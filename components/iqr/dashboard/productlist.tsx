
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { QrCode, ArrowUpDown, Eye, Edit, BarChartBig } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  qrCode: string;
  active: boolean;
  interactions: number;
}

export const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Smart Home Assistant',
      description: 'AI-powered home assistant with voice control',
      createdAt: '2024-05-01',
      qrCode: 'SH-2023-001',
      active: true,
      interactions: 245
    },
    {
      id: '2',
      name: 'Fitness Tracker Pro',
      description: 'Advanced fitness tracking with health insights',
      createdAt: '2024-04-28',
      qrCode: 'FT-2023-042',
      active: true,
      interactions: 187
    },
    {
      id: '3',
      name: 'Coffee Maker XL',
      description: 'Premium coffee maker with smart features',
      createdAt: '2024-04-15',
      qrCode: 'CM-2023-103',
      active: false,
      interactions: 94
    }
  ]);
  
  const toggleProductStatus = (id: string) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, active: !product.active } : product
    ));
  };
  
  // Sort states
  const [sortField, setSortField] = useState<keyof Product>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedProducts = [...products].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Card className="bg-card text-card-foreground card-shadow border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center">
          <QrCode className="h-5 w-5 mr-2 text-iqr-200" />
          Your QR Codes
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('name')}
                    className="flex items-center text-iqr-300 hover:text-iqr-400 p-0"
                  >
                    Product
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center text-iqr-300 hover:text-iqr-400 p-0"
                  >
                    Created
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">QR Code</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('active')}
                    className="flex items-center text-iqr-300 hover:text-iqr-400 p-0"
                  >
                    Status
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('interactions')}
                    className="flex items-center text-iqr-300 hover:text-iqr-400 p-0"
                  >
                    Usage
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {sortedProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="truncate max-w-[300px]">
                      {product.description}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{product.createdAt}</TableCell>
                  <TableCell className="hidden lg:table-cell">{product.qrCode}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={product.active} 
                        onCheckedChange={() => toggleProductStatus(product.id)}
                        className="data-[state=checked]:bg-iqr-200"
                      />
                      <Badge className={cn(
                        "text-xs",
                        product.active 
                          ? "bg-green-600/20 text-green-400" 
                          : "bg-gray-600/20 text-gray-400"
                      )}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{product.interactions}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <BarChartBig className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-iqr-300/70">
                    No products found. Create your first QR code above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
