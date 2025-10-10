from bing_image_downloader import downloader

downloader.download("Pants", limit=50, output_dir='data/images/pants', adult_filter_off=True, filter="photo", force_replace=False, timeout=60)
downloader.download("Tshirts", limit=50, output_dir='data/images/tshirts', adult_filter_off=True, filter="photo", force_replace=False, timeout=60)
downloader.download("Shoes", limit=50, output_dir='data/images/shoes', adult_filter_off=True, filter="photo", force_replace=False, timeout=60)