# Troubleshooting: Image Cropping in AI Try-On Results

## Problem
AI-generated try-on results sometimes have portions of the image cut off, showing incomplete body parts (missing head, feet, or sides).

## Root Causes

### 1. **Default Model Behavior**
- Gemini's image generation may default to standard dimensions
- Model might crop to focus on "important" areas
- No explicit framing instructions in the original prompt

### 2. **Aspect Ratio Mismatch**
- Input photo dimensions don't match model's default output
- Model may resize or crop to fit its preferred aspect ratio

### 3. **Attention/Focus Issues**
- AI focuses on clothing regions and may crop surrounding areas
- Missing explicit instructions to preserve full frame

## Solutions Implemented

### 1. **Enhanced Prompt with Frame Preservation**
Added explicit instructions to the AI prompt:

```
CRITICAL CONSTRAINTS:
- PRESERVE THE COMPLETE IMAGE FRAME: Generate the ENTIRE image from head to toe
- DO NOT CROP: The output must show the complete person from top to bottom
- MAINTAIN EXACT ASPECT RATIO: Output dimensions must match reference photo exactly

CRITICAL OUTPUT REQUIREMENTS:
- Generate a COMPLETE image showing the ENTIRE person from head to toe
- DO NOT crop or cut off any body parts (head, feet, arms, etc.)
- The output must have the SAME dimensions and framing as the reference photo
- Every pixel from the original frame should be represented in the output
```

### 2. **Improved Configuration**
Added model parameters for better consistency:
```typescript
const config = {
  responseModalities: ['IMAGE', 'TEXT'],
  temperature: 0.1,  // Lower temperature for more consistent outputs
  topP: 0.9,         // Request high quality output
};
```

### 3. **Logging and Diagnostics**
Added detailed logging to help identify cropping issues:
- Base photo size (bytes)
- Generated image size (bytes)
- Size ratio comparison
- Aspect ratio tracking

## Best Practices for Users

### 1. **Base Photo Guidelines**
✅ **DO:**
- Use well-framed photos with person centered
- Include full body from head to toe
- Leave some margin space around the person
- Use consistent lighting
- Stand against a simple background

❌ **DON'T:**
- Use already cropped photos
- Have person too close to image edges
- Use photos with extreme angles
- Upload very high or very low resolution images

### 2. **Recommended Photo Specs**
- **Aspect Ratio**: 3:4 or 9:16 (portrait orientation)
- **Resolution**: 1000-2000 pixels on longest side
- **File Size**: 1-5 MB
- **Format**: JPEG or PNG
- **Subject Position**: Centered with 10-15% margin on all sides

### 3. **If Cropping Still Occurs**

**Option A: Retry**
The AI model has some randomness. Simply try the same try-on again - results may vary.

**Option B: Adjust Base Photo**
1. Add more space/margin around your body in the photo
2. Ensure full body is visible with space above head and below feet
3. Re-upload and try again

**Option C: Use Different Clothing**
Sometimes certain clothing combinations work better than others. Try:
- One item at a time instead of full outfit
- Different categories in different sessions

## Technical Details

### Changes Made to `lib/ai/try-on-processor.ts`

#### 1. Frame Preservation Instructions
```typescript
// Added to prompt
- PRESERVE THE COMPLETE IMAGE FRAME
- DO NOT CROP
- MAINTAIN EXACT ASPECT RATIO
- Show ENTIRE person from head to toe
- Include all edges: top, bottom, left, right
```

#### 2. Configuration Updates
```typescript
const config = {
  responseModalities: ['IMAGE', 'TEXT'],
  temperature: 0.1,   // More deterministic
  topP: 0.9,          // High quality
};
```

#### 3. Diagnostic Logging
```typescript
// Size comparison logging
console.log('📐 Base photo size:', basePhotoBuffer.length, 'bytes');
console.log('📐 Generated image size:', generatedBuffer.length, 'bytes');
console.log('📊 Size ratio:', (generated/original).toFixed(2));
```

## Monitoring and Debugging

### Check Server Logs
When cropping occurs, check the logs for:

```
📐 Base photo size: 245678 bytes
📐 Generated image size: 180234 bytes
📊 Size ratio (generated/original): 0.73
```

**Red Flags:**
- Size ratio < 0.8 (image significantly smaller)
- Size ratio > 1.5 (image significantly larger)

### If Issues Persist

1. **Check Prompt in Logs**
   - Look for "📝 PROMPT PREVIEW" in server logs
   - Verify frame preservation instructions are included

2. **Verify Image Quality**
   - Ensure base photos are good quality
   - Check that images aren't already cropped

3. **Model Limitations**
   - Some model versions may have inherent cropping behavior
   - Consider testing with different model versions

## Future Improvements

### Potential Enhancements

1. **Pre-processing**
   - Add padding to input images
   - Normalize aspect ratios before sending to AI
   - Detect and warn about problematic framing

2. **Post-processing**
   - Detect cropped outputs
   - Automatically add margins/padding
   - Composite with original if needed

3. **Multi-shot Approach**
   - Generate multiple variations
   - Select best full-frame result
   - Ensemble different crops

4. **Alternative Models**
   - Test other image generation models
   - Use specialized try-on models (e.g., VITON-HD)
   - Implement custom inpainting approach

## Related Files
- `lib/ai/try-on-processor.ts` - Core AI processing
- `docs/REGION_BASED_AI_IMPROVEMENTS.md` - Region-specific editing
- `lib/types/common.ts` - Type definitions

---

**Last Updated**: 2025-10-12  
**Status**: ✅ Improvements Deployed  
**Monitoring**: Active

