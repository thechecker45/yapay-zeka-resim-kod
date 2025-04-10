import { Client, GatewayIntentBits, Events } from 'discord.js';
import fetch from 'node-fetch';
import fs from 'fs/promises';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '!';

async function logKomut(mesaj, komut, prompt) {
  const tarih = new Date();
  const logBilgisi = `[${tarih.toLocaleString('tr-TR')}] Kullanıcı: ${mesaj.author.tag} (${mesaj.author.id}) | ID: ${mesaj.guild?.id || 'DM'} | Komut: ${komut}\n`;
  
  try {
    await fs.appendFile('log.txt', logBilgisi);
  } catch (hata) {
    console.error('Log yazma hatası:', hata);
  }
}

client.on(Events.MessageCreate, async (mesaj) => {
  if (mesaj.author.bot) return;
  if (!mesaj.content.startsWith(PREFIX)) return;

  const komut = mesaj.content.slice(PREFIX.length).trim();
  await logKomut(mesaj, komut);

  if (komut === 'yardım') {
    const yardimMesaji = `
🤖 **Bot Komutları** 🤖

🎨 **!resimyap**
• Yapay zeka ile resim oluşturur
• Kullanım: \`!resimyap mavi gökyüzünde uçan kuşlar\`
• Örnek: \`!resimyap yağmurlu bir günde tokyo sokakları\`

❓ **!yardım**
• Bu yardım mesajını gösterir
• Kullanım: \`!yardım\`

📝 **Notlar:**
• Resim Oluştururken Girdileri İngilizce Girmeniz Önerilir
• Resim oluşturma işlemi birkaç dakika sürebilir
• Lütfen açık ve net açıklamalar kullanın
• Uygunsuz içerikler otomatik olarak engellenir
`;

    await mesaj.reply(yardimMesaji);
    return;
  }

  if (komut.startsWith('resimyap')) {
    const aciklama = komut.slice('resimyap'.length).trim();
    
    if (!aciklama) {
      mesaj.reply('Lütfen resim için bir açıklama girin!');
      return;
    }

    const beklemeMesaji = await mesaj.reply('Resim oluşturuluyor... (bu işlem birkaç dakika sürebilir)');

    try {
      const olusturmaYaniti = await fetch('https://stablehorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          //Buraya https://stablehorde.net sitesinden aldığınız apikey gelecek
          'apikey': 'APIKEYINIZ'
        },
        body: JSON.stringify({
          prompt: aciklama,
          params: {
            steps: 30,
            width: 512,
            height: 512,
          },
          nsfw: false,
          censor_nsfw: true,
          trusted_workers: true,
          models: ["stable_diffusion"]
        })
      });

      if (!olusturmaYaniti.ok) {
        throw new Error('Resim oluşturma isteği başarısız oldu');
      }

      const { id } = await olusturmaYaniti.json();
      
      let resimUrl = null;
      for (let i = 0; i < 60; i++) {
        const durumKontrolu = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`);
        const durum = await durumKontrolu.json();
        
        if (durum.done) {
          const sonucYaniti = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`);
          const sonuc = await sonucYaniti.json();
          
          if (sonuc.generations && sonuc.generations.length > 0) {
            resimUrl = sonuc.generations[0].img;
            break;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        if (i % 6 === 0) {
          await beklemeMesaji.edit(`Resim hala oluşturuluyor... (${Math.floor(i/6)} dakika geçti)`);
        }
      }

      if (!resimUrl) {
        throw new Error('Resim oluşturma zaman aşımına uğradı');
      }

      await beklemeMesaji.edit({
        content: `İşte "${aciklama}" için oluşturulan resminiz:`,
        files: [resimUrl]
      });
    } catch (hata) {
      console.error('Hata:', hata);
      await beklemeMesaji.edit('Üzgünüm, resim oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }
});
// Buraya Botunuzun Tokeni gelecek
client.login('Botunuzun Tokeni');