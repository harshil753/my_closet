/**
 * Integration Tests for Closet View
 *
 * This test suite covers the integration between closet view components,
 * API endpoints, and data flow for clothing item management.
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { jest } from '@jest/globals';
import ClosetView from '@/components/features/closet/ClosetView';
import { ClothingItemCard } from '@/components/features/closet/ClothingItemCard';
import { AuthProvider } from '@/lib/auth/auth-context';

// Mock fetch for API calls
global.fetch = jest.fn();

// Helper to render with AuthProvider
const renderWithAuth = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

// Mock clothing items data with proper structure
const mockClothingItems = [
  {
    id: '1',
    name: 'Blue T-Shirt',
    category: 'shirts_tops',
    image_url: 'https://example.com/blue-shirt.jpg',
    thumbnail_url: 'https://example.com/blue-shirt-thumb.jpg',
    uploaded_at: '2024-01-01T00:00:00Z',
    is_active: true,
    metadata: {
      color: 'Blue',
      brand: 'Nike',
      size: 'M',
      notes: 'Casual wear',
    },
    user_id: 'test-user-id',
  },
  {
    id: '2',
    name: 'Black Jeans',
    category: 'pants_bottoms',
    image_url: 'https://example.com/black-jeans.jpg',
    thumbnail_url: 'https://example.com/black-jeans-thumb.jpg',
    uploaded_at: '2024-01-02T00:00:00Z',
    is_active: true,
    metadata: {
      color: 'Black',
      brand: "Levi's",
      size: '32',
      notes: 'Skinny fit',
    },
    user_id: 'test-user-id',
  },
  {
    id: '3',
    name: 'Red Dress',
    category: 'shirts_tops',
    image_url: 'https://example.com/red-dress.jpg',
    thumbnail_url: 'https://example.com/red-dress-thumb.jpg',
    uploaded_at: '2024-01-03T00:00:00Z',
    is_active: true,
    metadata: {
      color: 'Red',
      brand: 'Zara',
      size: 'S',
      notes: 'Formal wear',
    },
    user_id: 'test-user-id',
  },
];

describe('ClosetView Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockClothingItems }),
    });
  });

  describe('Data Loading Integration', () => {
    it('loads clothing items on component mount', async () => {
      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/clothing-items', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });
    });

    it('displays loading state while fetching data', () => {
      (fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: mockClothingItems,
                  }),
                }),
              100
            )
          )
      );

      renderWithAuth(<ClosetView />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('handles API error gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to load items' }),
      });

      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load items/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering Integration', () => {
    it('filters items by category', async () => {
      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Jeans')).toBeInTheDocument();
        expect(screen.getByText('Red Dress')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByLabelText(/filter by category/i);
      fireEvent.change(categoryFilter, { target: { value: 'shirts_tops' } });

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
        expect(screen.queryByText('Black Jeans')).not.toBeInTheDocument();
        expect(screen.queryByText('Red Dress')).not.toBeInTheDocument();
      });
    });

    it('filters items by color', async () => {
      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Jeans')).toBeInTheDocument();
        expect(screen.getByText('Red Dress')).toBeInTheDocument();
      });

      const colorFilter = screen.getByLabelText(/filter by color/i);
      fireEvent.change(colorFilter, { target: { value: 'Blue' } });

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
        expect(screen.queryByText('Black Jeans')).not.toBeInTheDocument();
        expect(screen.queryByText('Red Dress')).not.toBeInTheDocument();
      });
    });

    it('searches items by name', async () => {
      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Jeans')).toBeInTheDocument();
        expect(screen.getByText('Red Dress')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search items/i);
      fireEvent.change(searchInput, { target: { value: 'dress' } });

      await waitFor(() => {
        expect(screen.queryByText('Blue T-Shirt')).not.toBeInTheDocument();
        expect(screen.queryByText('Black Jeans')).not.toBeInTheDocument();
        expect(screen.getByText('Red Dress')).toBeInTheDocument();
      });
    });

    it('combines multiple filters', async () => {
      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Jeans')).toBeInTheDocument();
        expect(screen.getByText('Red Dress')).toBeInTheDocument();
      });

      // Apply category filter
      const categoryFilter = screen.getByLabelText(/filter by category/i);
      fireEvent.change(categoryFilter, { target: { value: 'shirts_tops' } });

      // Apply color filter
      const colorFilter = screen.getByLabelText(/filter by color/i);
      fireEvent.change(colorFilter, { target: { value: 'Blue' } });

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
        expect(screen.queryByText('Black Jeans')).not.toBeInTheDocument();
        expect(screen.queryByText('Red Dress')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sorting Integration', () => {
    it('sorts items by name', async () => {
      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      fireEvent.change(sortSelect, { target: { value: 'name' } });

      await waitFor(() => {
        const items = screen.getAllByTestId('clothing-item-card');
        expect(items[0]).toHaveTextContent('Black Jeans');
        expect(items[1]).toHaveTextContent('Blue T-Shirt');
        expect(items[2]).toHaveTextContent('Red Dress');
      });
    });

    it('sorts items by date', async () => {
      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      fireEvent.change(sortSelect, { target: { value: 'date' } });

      await waitFor(() => {
        const items = screen.getAllByTestId('clothing-item-card');
        expect(items[0]).toHaveTextContent('Red Dress'); // Most recent
        expect(items[1]).toHaveTextContent('Black Jeans');
        expect(items[2]).toHaveTextContent('Blue T-Shirt'); // Oldest
      });
    });
  });

  describe('Pagination Integration', () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => ({
      ...mockClothingItems[0],
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
    }));

    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: manyItems }),
      });
    });

    it('displays pagination controls for many items', async () => {
      renderWithAuth(<ClosetView itemsPerPage={10} />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /next page/i })
        ).toBeInTheDocument();
      });
    });

    it('navigates between pages', async () => {
      renderWithAuth(<ClosetView itemsPerPage={10} />);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.queryByText('Item 11')).not.toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next page/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Item 11')).toBeInTheDocument();
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Item Selection Integration', () => {
    it('selects and deselects items', async () => {
      const onSelectionChange = jest.fn();
      renderWithAuth(
        <ClosetView selectable={true} onSelectionChange={onSelectionChange} />
      );

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });

      const firstItem = screen.getAllByTestId('clothing-item-card')[0];
      fireEvent.click(firstItem);

      expect(onSelectionChange).toHaveBeenCalledWith(['1']);

      fireEvent.click(firstItem);
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('selects multiple items', async () => {
      const onSelectionChange = jest.fn();
      renderWithAuth(
        <ClosetView selectable={true} onSelectionChange={onSelectionChange} />
      );

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });

      const items = screen.getAllByTestId('clothing-item-card');
      fireEvent.click(items[0]);
      fireEvent.click(items[1]);

      expect(onSelectionChange).toHaveBeenCalledWith(['1', '2']);
    });
  });

  describe('Item Actions Integration', () => {
    it('handles item edit action', async () => {
      const onItemEdit = jest.fn();
      renderWithAuth(<ClosetView onItemEdit={onItemEdit} />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      fireEvent.click(editButton);

      expect(onItemEdit).toHaveBeenCalledWith(mockClothingItems[0]);
    });

    it('handles item delete action', async () => {
      const onItemDelete = jest.fn();
      renderWithAuth(<ClosetView onItemDelete={onItemDelete} />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', {
        name: /delete/i,
      })[0];
      fireEvent.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmButton);

      expect(onItemDelete).toHaveBeenCalledWith(mockClothingItems[0]);
    });

    it('handles item view action', async () => {
      const onItemView = jest.fn();
      renderWithAuth(<ClosetView onItemView={onItemView} />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });

      const viewButton = screen.getAllByRole('button', { name: /view/i })[0];
      fireEvent.click(viewButton);

      expect(onItemView).toHaveBeenCalledWith(mockClothingItems[0]);
    });
  });

  describe('View Mode Integration', () => {
    it('switches between grid and list view', async () => {
      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });

      const viewToggle = screen.getByRole('button', { name: /list view/i });
      fireEvent.click(viewToggle);

      expect(screen.getByTestId('closet-list-view')).toBeInTheDocument();

      const gridToggle = screen.getByRole('button', { name: /grid view/i });
      fireEvent.click(gridToggle);

      expect(screen.getByTestId('closet-grid-view')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('retries failed API calls', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockClothingItems }),
        });

      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      });
    });

    it('shows error message for persistent failures', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithAuth(<ClosetView />);

      await waitFor(() => {
        expect(screen.getByText(/unable to load items/i)).toBeInTheDocument();
      });
    });
  });
});

describe('ClothingItemCard Integration', () => {
  const mockItem = mockClothingItems[0];

  describe('Display Integration', () => {
    it('displays item information correctly', async () => {
      await act(async () => {
        render(<ClothingItemCard item={mockItem} viewMode="grid" />);
      });

      expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
      expect(screen.getByText(/Nike/)).toBeInTheDocument();
      expect(screen.getByText(/M/)).toBeInTheDocument();
    });

    it('handles image with valid src', async () => {
      await act(async () => {
        render(<ClothingItemCard item={mockItem} viewMode="grid" />);
      });

      await waitFor(() => {
        const images = screen.queryAllByRole('img');
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it('handles item with no image', async () => {
      const itemNoImage = { ...mockItem, image_url: '', thumbnail_url: '' };
      await act(async () => {
        render(<ClothingItemCard item={itemNoImage} viewMode="grid" />);
      });

      expect(screen.getByText('Blue T-Shirt')).toBeInTheDocument();
    });
  });

  describe('Selection Integration', () => {
    it('handles selection click', async () => {
      const onSelect = jest.fn();
      await act(async () => {
        render(
          <ClothingItemCard
            item={mockItem}
            viewMode="grid"
            selectable={true}
            onSelect={onSelect}
          />
        );
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('clothing-item-card'));
      });
      expect(onSelect).toHaveBeenCalled();
    });
  });

  describe('Action Integration', () => {
    it('handles edit action', async () => {
      const onEdit = jest.fn();
      await act(async () => {
        render(
          <ClothingItemCard item={mockItem} viewMode="grid" onEdit={onEdit} />
        );
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /edit item/i }));
      });
      expect(onEdit).toHaveBeenCalled();
    });

    it('handles delete action', async () => {
      const onDelete = jest.fn();
      await act(async () => {
        render(
          <ClothingItemCard
            item={mockItem}
            viewMode="grid"
            onDelete={onDelete}
          />
        );
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete item/i }));
      });
      expect(onDelete).toHaveBeenCalled();
    });
  });
});
