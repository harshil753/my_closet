# Coding Standards

## General Principles

- **Simplicity First**: Write code that is easy to read, understand, and maintain
- **User-Friendly**: Code should be accessible to developers with 1-2 years of experience
- **Clean Code**: Follow established patterns and conventions
- **Documentation**: Comment complex logic and provide clear explanations

## TypeScript/JavaScript Standards

### Naming Conventions
- **Variables**: `camelCase` for variables and functions
- **Constants**: `UPPER_SNAKE_CASE` for constants
- **Components**: `PascalCase` for React components
- **Files**: `kebab-case` for file names, `PascalCase` for component files

### Code Structure
```typescript
// Good: Clear, descriptive names
const userClothingItems = await fetchUserClothing();
const isPremiumUser = user.tier === 'premium';

// Good: Component with clear props interface
interface ClothingItemProps {
  item: ClothingItem;
  onSelect: (item: ClothingItem) => void;
}

export function ClothingItemCard({ item, onSelect }: ClothingItemProps) {
  // Component logic here
}
```

### Comments and Documentation
```typescript
/**
 * Compresses an image file to optimize storage and performance
 * @param file - The image file to compress
 * @param maxSize - Maximum file size in bytes (default: 2MB)
 * @returns Promise<Buffer> - Compressed image buffer
 */
async function compressImage(file: File, maxSize: number = 2 * 1024 * 1024): Promise<Buffer> {
  // Implementation details with inline comments for complex logic
}
```

## Python Standards

### Code Style
- Follow PEP 8 guidelines
- Use type hints for all function parameters and return values
- Use descriptive variable names

```python
# Good: Clear function with type hints
def process_clothing_image(image_path: str, compression_quality: int = 85) -> bytes:
    """
    Process and compress a clothing image for storage.
    
    Args:
        image_path: Path to the source image file
        compression_quality: JPEG compression quality (1-100)
        
    Returns:
        Compressed image data as bytes
        
    Raises:
        ValueError: If image_path is invalid
        IOError: If image cannot be processed
    """
    # Implementation with clear variable names
    processed_image = Image.open(image_path)
    compressed_buffer = io.BytesIO()
    processed_image.save(compressed_buffer, format='JPEG', quality=compression_quality)
    return compressed_buffer.getvalue()
```

## File Organization

### React Components
```
components/
├── ui/                    # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Modal.tsx
├── features/             # Feature-specific components
│   ├── closet/
│   └── try-on/
└── layout/               # Layout components
    ├── Header.tsx
    └── Footer.tsx
```

### Python Services
```
services/
├── __init__.py
├── image_processor.py    # Image processing logic
├── ai_processor.py       # AI integration
└── utils.py              # Utility functions
```

## Testing Standards

### Unit Tests
- Test individual functions and components
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
// Good: Clear test structure
describe('ClothingItemCard', () => {
  it('should display item name and category', () => {
    // Arrange
    const mockItem: ClothingItem = {
      id: '1',
      name: 'Blue Shirt',
      category: 'shirts',
      imageUrl: '/images/shirt.jpg'
    };
    
    // Act
    render(<ClothingItemCard item={mockItem} onSelect={jest.fn()} />);
    
    // Assert
    expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
    expect(screen.getByText('shirts')).toBeInTheDocument();
  });
});
```

## Error Handling

### TypeScript
```typescript
// Good: Proper error handling with user-friendly messages
try {
  const result = await processImage(file);
  return result;
} catch (error) {
  console.error('Image processing failed:', error);
  throw new Error('Failed to process image. Please try again with a different file.');
}
```

### Python
```python
# Good: Specific error handling
try:
    result = process_image(image_path)
    return result
except FileNotFoundError:
    raise ValueError(f"Image file not found: {image_path}")
except PIL.UnidentifiedImageError:
    raise ValueError("Invalid image format. Please use JPEG, PNG, or WebP.")
```

## Performance Guidelines

- Use React.memo for expensive components
- Implement proper loading states
- Optimize images before upload
- Use database indexes for queries
- Implement proper caching strategies

## Security Guidelines

- Validate all user inputs
- Use environment variables for secrets
- Implement proper authentication checks
- Sanitize file uploads
- Use HTTPS in production
