async function researchAddon() {
  try {
    const manifestUrl = 'https://sports.highfly.dev/eyJpbmNsdWRlU3BvcnRzIjpbImZvb3RiYWxsIl19/manifest.json';
    const res = await fetch(manifestUrl);
    const manifest = await res.json();
    console.log("Manifest:", JSON.stringify(manifest, null, 2));

    // If there are catalogs, let's fetch the first one
    if (manifest.catalogs && manifest.catalogs.length > 0) {
      const catalog = manifest.catalogs[0];
      const catalogUrl = `https://sports.highfly.dev/eyJpbmNsdWRlU3BvcnRzIjpbImZvb3RiYWxsIl19/catalog/${catalog.type}/${catalog.id}.json`;
      console.log(`\nFetching catalog from: ${catalogUrl}`);
      const catRes = await fetch(catalogUrl);
      const catData = await catRes.json();
      console.log(`\nCatalog Items (First 2):`, JSON.stringify(catData.metas?.slice(0, 2), null, 2));
      
      // Let's try to get stream links for the first item
      if (catData.metas && catData.metas.length > 0) {
        const firstItem = catData.metas[0];
        const streamUrl = `https://sports.highfly.dev/eyJpbmNsdWRlU3BvcnRzIjpbImZvb3RiYWxsIl19/stream/${firstItem.type}/${firstItem.id}.json`;
        console.log(`\nFetching streams for ${firstItem.id} from: ${streamUrl}`);
        const streamRes = await fetch(streamUrl);
        const streamData = await streamRes.json();
        console.log(`\nStreams (First 2):`, JSON.stringify(streamData.streams?.slice(0, 2), null, 2));
      }
    }

  } catch (e) {
    console.error(e);
  }
}
researchAddon();
