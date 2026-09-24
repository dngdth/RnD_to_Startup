export interface LoginFormState {
  email: string;
  matKhau: string;
  rememberMe: boolean;
}

export interface FormError {
  email?: string;
  matKhau?: string;
  general?: string;
}

export interface ProductCardItem {
  id: string;
  name: string;
  category: 'áo thun' | 'sơ mi' | 'polo' | 'áo lớp' | 'đồng phục';
  colorName: string;
  colorHex: string;
  tag: string;
  material: string;
  imageUrl: string;
  code: string;
}

