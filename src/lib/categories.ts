import { supabaseAdmin } from './supabase-admin';
import { Category } from '../types/admin';

export interface CategoryFormData {
  name: string;
  description: string;
  display_order: number;
}

export interface CategoryResult {
  success: boolean;
  category?: Category;
  error?: string;
}

// Get all categories
export async function getCategories() {
  return await supabaseAdmin
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });
}

// Create category
export async function createCategory(formData: CategoryFormData): Promise<CategoryResult> {
  try {
    // Check if category name already exists
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', formData.name)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'Uma categoria com este nome já existe',
      };
    }

    // Insert category
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        name: formData.name,
        description: formData.description,
        display_order: formData.display_order,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      category: data,
    };
  } catch (error) {
    console.error('Error creating category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Update category
export async function updateCategory(
  id: string,
  formData: CategoryFormData
): Promise<CategoryResult> {
  try {
    // Check if another category with same name exists
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', formData.name)
      .neq('id', id)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'Uma categoria com este nome já existe',
      };
    }

    // Update category
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update({
        name: formData.name,
        description: formData.description,
        display_order: formData.display_order,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      category: data,
    };
  } catch (error) {
    console.error('Error updating category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Delete category
export async function deleteCategory(id: string): Promise<CategoryResult> {
  try {
    // Check if category has products
    const { count } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) {
      return {
        success: false,
        error: `Não é possível deletar esta categoria pois ela possui ${count} produto(s) associado(s)`,
      };
    }

    // Delete category
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Reorder categories
export async function reorderCategories(categories: Category[]): Promise<CategoryResult> {
  try {
    // Update display_order for all categories
    const updates = categories.map((category, index) =>
      supabaseAdmin
        .from('categories')
        .update({ display_order: index + 1 })
        .eq('id', category.id)
    );

    await Promise.all(updates);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error reordering categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
