# Blender 場景與烘焙流程（v2）

用腳本從零建一個「書桌 + 復古 CRT 電腦」的場景，烘焙成 app 能直接讀的格式。腳本是 `blender/scene_v2.py`，輸出在 `blender/out/v2/`（進 git）。

## 怎麼跑

```
/Applications/Blender.app/Contents/MacOS/Blender -b -P blender/scene_v2.py                 # 2048、256 samples，約 9 分鐘（CPU）
BAKE_SIZE=1024 BAKE_SAMPLES=64 /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/scene_v2.py   # 快速版，約 45 秒
BAKE_DENOISE=0 ...                                                                          # 跳過降噪（比較用）
LIGHTMAP=v2/computer /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/check_lightmap.py      # environment、decor 同理
cd blender/preview && npm ci && npm run dev                                                   # 預覽，port 8093
bash tools/preview-shots.sh "$TMPDIR/pv"                                                      # headless Chrome 截圖
```

輸出在 `blender/out/v2/`：`computer`、`environment`、`decor` 三組，各一個 `.glb` 加一張 2048 的 `.jpg`。`check_lightmap.py` 必須給 `LIGHTMAP`，沒給會印用法並以 2 結束。

## 各部分做什麼

- **座標**：沿用 app 的 glTF 單位：地板 y = -3.32、桌面 y = -0.50、螢幕中心 (0, 1.056, 0.283)；電腦主機頂在 y = 0。不是公尺，1 單位約 0.27 公尺（app 把每個 mesh 放大 900 倍）。Blender 是 z 朝上，glTF 的 (x, y, z) 在 Blender 是 (x, -z, y)，觀看方向（glTF +z）在 Blender 是 -y。
- **房間**：地板加兩面牆，都是單面平面。牆放在 idle 鏡頭的對面兩側（後面、右邊），所以不會擋住書桌，開放的兩側露出 app 的背景，像模型屋。另加踢腳板和地毯。
- **書桌、椅子**：全部用方塊、圓柱拼出來。桌子右邊有三格抽屜櫃，椅子是五爪腳、氣壓桿、座墊、椅背，轉 14 度。
- **電腦**：臥式主機（兩個 5.25 吋槽、軟碟槽、電源鍵、琥珀色 LED、通風孔）放在 CRT 下面。CRT 先直立建好，再整組繞螢幕中心往後仰 3 度：前殼是一個方塊，正面挖出螢幕開口，往內凹到玻璃；外緣導圓角，開口不導（導了會讓螢幕變小）。後面是往牆收窄的映像管外殼、頂部散熱槽，下巴有旋鈕、電源鍵、綠色 LED，沒有品牌字。底座不跟著仰。鍵盤是斜的楔形底座加 5 排梯形鍵帽，旁邊有滑鼠和滑鼠墊。
- **螢幕**：`Screen` 是獨立的平面 mesh，深色（#0c1210），開口大小 1.42 × 1.14。烘焙時它和電腦合在一起（共用一張圖集），烘完才用材質分離出來，所以 UV 不會重疊。
- **`ScreenAnchor`**：一個 Empty，位置在螢幕中心，glTF 的 local +z 是螢幕法線（朝觀看者、往上仰 3 度），extras 有 `width`、`height`。glTF 匯出會把 Blender 的 local -Y 變成 glTF 的 local +Z，所以在 Blender 裡它的旋轉是 x = -3°。它不是 mesh，所以 app 的 `BakedModel` 不會把它放大 900 倍，讀它時要自己乘 900。
- **裝飾**：桌燈（燈罩對著鍵盤，裡面一盞 spot light）、馬克杯、三片軟碟、便條紙和鉛筆、牆上的條紋夕陽畫、Kenney 的書（`fit()` 縮放到指定高度）。後牆角落有一盆腳本做的虎尾蘭（陶盆加 9 片葉子，葉子是封閉的薄片，因為 app 會剔除背面）。
- **燈光**：單位放大約 3.8 倍，所以瓦數約是公尺制的 3.8² 倍：窗光 1300（右牆旁）、補光 900、天花板 500、桌燈 spot 150、螢幕微光 25（area light 只往前發光，所以玻璃不會被照亮），天空 0.2。
- **合併與 UV**：每組合併成一個物件，刪掉貼在地板、桌面、主機頂上朝下的面。lightmap UV 是**唯一**一組 UV（TEXCOORD_0），因為 app 的 `BakedModel` 用第一組 UV 讀貼圖。流程：Smart UV、等密度、牆地板 0.4 倍、`pack_islands(margin=0.006)`。
- **烘焙**：三組一次烘完（同一次 `bake`，每組材質指向自己的圖），Cycles、Combined、float buffer、Standard、exposure -1、margin 8。關掉 glossy，因為反光跟視角有關，烘進貼圖會出現從哪個角度看都在的亮點。用 assert 確保沒有材質被兩組共用，否則同一個材質會烘兩次。
- **為什麼分三組**：app 讀三組模型、三張圖（`sources.ts`），而且三張 2048 的總像素是一張的三倍，道具比較清楚。

## 降噪

Cycles 的 `use_denoising` 只作用在算圖，不作用在 bake，所以烘完之後 `scene_v2.py` 的 `denoise()` 把每張 float 圖送進合成器的 Denoise 節點（OpenImageDenoise，HDR 模式），存成線性 EXR 中繼檔（`blender/cache/`，已 gitignore），再載回來當作要輸出的圖。這一步發生在 `view_transform = "Standard"` 之前，所以中繼檔是線性資料，之後存 JPG 才套用色彩轉換。

- 合成器時算圖引擎暫時切成 Workbench，場景不會再被路徑追蹤一次。
- Blender 5.x 用 `scene.compositing_node_group`（4.x 是 `scene.node_tree`），而且 Denoise 節點的 HDR 從屬性變成輸入 socket `HDR`；兩種版本都有處理（測於 5.2.2）。
- `BAKE_DENOISE=0` 可以跳過這一步。

`check_lightmap.py` 印的 `noise` 是「覆蓋的 texel 中、四個鄰居也都被覆蓋者的亮度拉普拉斯絕對值平均」，數字越低越平滑；島的邊界不算。2048 / 256 samples：

| 組 | 降噪前 | 降噪後 | 降低 |
|---|---|---|---|
| computer | 0.05200 | 0.02667 | 49% |
| environment | 0.01643 | 0.00772 | 53% |
| decor | 0.01438 | 0.00669 | 53% |

三組 UV 重疊 texel 都是 0。

## 已知限制

- 預覽的 live 模式對 v2 不準：那組燈光是為別的單位調的。只看 baked。
- 沒有線材（鍵盤線、電源線）。CRT 螢幕是平的，好讓 iframe 貼上去。
- 只有兩面牆和地板。idle 鏡頭看得到房間外面，那裡是 app 的背景色。
- 近黑 texel 多半是看不到的面（畫框背面、軟碟下面、花盆朝牆角的一側、桌板底面、地毯下的地板）。
