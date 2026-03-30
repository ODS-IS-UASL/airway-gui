<template>
  <div class="layer-control">
    <ClientOnly>
      <!-- 読み込み中表示スピナー -->
      <LoadingDialog v-model:dialog-visible="isLoading" />
    </ClientOnly>
    <dl>
      <div>
        <dt>地理情報</dt>
      </div>
      <dd>
        <ul>
          <li>
            <label><input type="checkbox" :id="chk_feature_id" ref="chkFeature" :disabled="isDisabled"/> 地物</label>
          </li>
        </ul>
      </dd>
      <div style="font-size: 0.8rem">
        <dt>天候情報</dt>
      </div>
      <dd>
        <ul>
          <li>
            <label><input type="checkbox" :id="chk_raincloud_id" ref="chkRaincloud" :disabled="isDisabled"/> 雨雲</label>
          </li>
          <li>
            <label><input type="checkbox" :id="chk_airfv_id" ref="chkAirfv" :disabled="isDisabled"/> 風向・風量</label>
          </li>
        </ul>
      </dd>
      <div style="font-size: 0.8rem">
        <dt>電波種</dt>
      </div>
      <dd>
        <ul>
          <li>
            <label><input type="checkbox" :id="chk_lte_id" ref="chkLte" :disabled="isDisabled"/> 無線</label>
          </li>
        </ul>
      </dd>
      <div style="font-size: 0.8rem">
        <label>気象レーダー</label><br>
        <div class="wi_range_container">
          <input :id="wi_range_id" class="wi_range" type="range" min="0" max="8" value="0" step="1" ref="wiRange" :disabled="isDisabled">
          <div class="wi_range_labels">
            <span>現在</span>
            <span>1時間後</span>
            <span>2時間後</span>
            <span>3時間後</span>
            <span>4時間後</span>
            <span>5時間後</span>
            <span>6時間後</span>
            <span>7時間後</span>
            <span>8時間後</span>
          </div>
        </div>
      </div>
    </dl>
  </div>
</template>

<script setup>
  import 'leaflet/dist/leaflet.css';
  import { ref, onMounted, defineEmits, defineProps} from 'vue';
  import proj4 from 'proj4'
  import LoadingDialog from '~/components/dialogs/LoadingSpiner.vue'
  import * as turf from "@turf/turf";

  const props = defineProps({
    map:{
      type: Object,
      required: false,
    },
    map_moveend:{
      type: Boolean,
      required: true,
    },
    stepNo:{
      type: String,
      required: false,
      default: "0",
    }
  });
  const emit = defineEmits(['Weather_Changeed', 'MapLayerControl_Mounted']);
  let air_info_list = [];
  let allowIconList = [];
  let featureList = [];
  let rectangleIconList = [];
  let lteIconList = [];
  const Weather_Changeed = ref(false);
  const geoJsonBldg = ref(null);
  const geoJsonTran = ref(null);
  const geoJsonRwy = ref(null);
  const geoJsonFld = ref(null);
  let file53Data = {};
  let lte53Data = []; 
  let file54Data = {};
  let lte54Data = []; 
  const isDisabled = ref(true);
  const chkFeature = ref(null);
  const chkRaincloud = ref(null);
  const chkAirfv = ref(null);
  const chkLte = ref(null);
  const wiRange = ref(null);
  proj4.defs("EPSG:6691", "+proj=longlat +datum=WGS84 +no_defs"); // JGD2000座標系

  const isLoading = useState('isLoading')// スピナー表示状態
  // ローディング解除
  isLoading.value = false;

  // 各チェックボックスのIdを取得
  const chk_feature_id = computed (() => `chk_feature_${props.stepNo}`);
  const chk_raincloud_id = computed (() => `chk_raincloud_${props.stepNo}`);
  const chk_airfv_id = computed (() => `chk_airfv_${props.stepNo}`);
  const chk_lte_id = computed (() => `chk_lte_${props.stepNo}`);
  const wi_range_id = computed (() => `wi_range_${props.stepNo}`);

   // 地物ロード
  const loadGeoJson = async () => {
    try {
      let jsonFile = await fetch('/geojson/bldg_533877.geojson'); // ゼンリン地物情報未契約の場合は使用不可、コンテナ内からファイルを削除する
      if (!jsonFile.ok) {
        throw Error('ファイルの読み込みに失敗しました');
      }
      geoJsonBldg.value = await jsonFile.json();
    } catch(err) {
      console.error(err)
      geoJsonBldg.value = {};
    }

    try {
      let jsonFile = await fetch('/geojson/tran_53387734-35-44-45.geojson'); // ゼンリン地物情報未契約の場合は使用不可、コンテナ内からファイルを削除する
      if (!jsonFile.ok) {
        throw Error('ファイルの読み込みに失敗しました');
      }
      geoJsonTran.value = await jsonFile.json();
    } catch(err) {
      console.error(err)
      geoJsonTran.value = {};
    }

    try {
      let jsonFile = await fetch('/geojson/fld_53387734-35-44-45.geojson'); // ゼンリン地物情報未契約の場合は使用不可、コンテナ内からファイルを削除する
      if (!jsonFile.ok) {
        throw Error('ファイルの読み込みに失敗しました');
      }
      geoJsonFld.value = await jsonFile.json();
    } catch(err) {
      console.error(err)
      geoJsonFld.value = {};
    }

    try {
      let jsonFile = await fetch('/geojson/rwy_533877.geojson'); // ゼンリン地物情報未契約の場合は使用不可、コンテナ内からファイルを削除する
      if (!jsonFile.ok) {
        throw Error('ファイルの読み込みに失敗しました');
      }
      geoJsonRwy.value = await jsonFile.json();
    } catch(err) {
      console.error(err)
      geoJsonRwy.value = {};
    }
  }

  // 電波ロード
  const loadLteFile = async () => {
    try {
      const response = await fetch('/lte/UTM53N_800_100.txt'); // KDDI電波情報未契約の場合は使用不可、コンテナ内からファイルを削除する
      if (!response.ok) {
        throw Error('ファイルの読み込みに失敗しました');
      }
      const content = await response.text();
      const data = await parseFileContent(content); // 読み込んだ内容を解析
      file53Data = data[0]
      lte53Data = data[1]; 
    } catch (err) {
      console.error(err);
      file53Data = {}
      lte53Data = []; 
    }

    try {
      const response = await fetch('/lte/UTM54N_800_100.txt'); // KDDI電波情報未契約の場合は使用不可、コンテナ内からファイルを削除する
      if (!response.ok) {
        throw Error('ファイルの読み込みに失敗しました');
      }
      const content = await response.text();
      const data = await parseFileContent(content); // 読み込んだ内容を解析
      file54Data = data[0]
      lte54Data = data[1]; 
    } catch (err) {
      console.error(err);
      file54Data = {}
      lte54Data = []; 
    } 
  }

  // ファイルの内容を解析してキーとバリューのペアを作成
  const parseFileContent = async(content) => {
    const lines = content.split('\n');
    const readData = {};
    let lastLine = [];

    // 最後の1行を文字列として取り出し、その他をキーとバリューのペアとして処理
    lines.forEach((line, index) => {
      // 最後の行ならば文字列として保存
      if (index > 5) {
        lastLine.push(line.trim());
      } else {
        // 他の行はスペースでキーとバリューに分けてオブジェクトに格納
        const [key, value] = line.split(/\s+/, 2);
        if (key && value) {
          readData[key] = value.trim();
        }
      }
    });

    return [readData, lastLine];
  }
    
  onMounted(async () => {
    console.log("mapLayerControl started");
    let chk_feature;
    let chk_raincloud;
    let chk_airfv;
    let chk_lte;
    let rang_weather_radar;

    await loadGeoJson();
    await loadLteFile();

    // 地物削除
    const removefeatureinfo = async (map) => {
      isLoading.value = true;
      // 描画されていない場合はなにもしない。
      if (featureList.length == 0) {
        console.log(`No draw featureinfo:${featureList.length}`);
        isLoading.value = false;
        return;
      }
      for (let i = 0; i < featureList.length; i++) {
        map.removeLayer(featureList[i]);
      }
      featureList = [];
      isLoading.value = false;
    }

    // 地物表示
    const updatefeatureinfo = async (checked, map) => {
      console.log(`地物のチェック状態：${checked}`);
      try {
        if (checked) {
          isLoading.value = true;
          if (geoJsonFld.value) {
            const feature_obj = L.geoJson(geoJsonFld.value, {
              style: {
                color: "#42A5F5",
                weight: 0.5,
                opacity: 0.5,
                fillColor: "#42A5F5",
                fillOpacity: 0.5,
              }
            }).addTo(map);
            featureList.push(feature_obj);
          }
          if (geoJsonTran.value) {
            const feature_obj = L.geoJson(geoJsonTran.value, {
              style: {
                color: "#734E30",
                weight: 0.5,
                opacity: 0.5,
                fillColor: "#734E30",
                fillOpacity: 0.5,
              }
            }).addTo(map);
            featureList.push(feature_obj);
          }
          if (geoJsonRwy.value) {
            const feature_obj = L.geoJson(geoJsonRwy.value, {
              style: {
                color: "#008000",
                weight: 0.5,
                opacity: 0.5,
                fillColor: "#008000",
                fillOpacity: 0.5,
              }
            }).addTo(map);
            featureList.push(feature_obj);
          }
          if (geoJsonBldg.value) {
            const feature_obj = L.geoJson(geoJsonBldg.value, {
              style: {
                color: "#F78FA7",
                weight: 0.5,
                opacity: 0.5,
                fillColor: "#F78FA7",
                fillOpacity: 0.5,
              }
            }).addTo(map);
            featureList.push(feature_obj);
          }
          isLoading.value = false;
        } else {
          await removefeatureinfo(map);
        }
      } catch (error) {
        console.error(`updatefeatureinfo error(${error.message})`);
        console.error('updatefeatureinfo error Stack trace:', error.stack);
        isLoading.value = false;
        return;
      }
    }

    // 雨量アイコン削除
    const removeraincloud = async (map) => {
      isLoading.value = true;
      // 描画されていない場合はなにもしない。
      if (rectangleIconList.length == 0) {
        console.log(`No draw airinfo:${rectangleIconList.length}`);
        isLoading.value = false;
        return;
      }
      for (let i =0; i < rectangleIconList.length; i++) {
        map.removeLayer(rectangleIconList[i]);
      }
      rectangleIconList = [];
      isLoading.value = false;
    };

    // 雨量アイコン表示
    const updateRainCloud = async (checked, map, time_index) => {
      try {
        console.log(`雨量のチェック状態：${checked}`);
        if(checked){
          isLoading.value = true;
          // 北西端、南東端の座標取得
          const bounds = map.getBounds();
          const northwest = bounds.getNorthWest();
          const southeast = bounds.getSouthEast();
          const params = { elements: 'apcp' };
          const indexResponse = await $fetch('/api/weather/index', { 
            method: 'GET',
            query: params
          });
          if (indexResponse.status !== 200) {
            console.error(`$fetch error{status: ${indexResponse.status}}.`);
            isLoading.value = false;
            return;
          }

          const indexData = indexResponse.data;
          if (!indexData || !indexData.Index || !indexData.Index[0] || !indexData.Index[0].Timelist) {
            console.error('Invalid index data format');
            isLoading.value = false;
            return;
          }
          
          const sortedTimelist = indexData.Index[0].Timelist.sort((a, b) => b.Basetime.localeCompare(a.Basetime));
          const latestTime = sortedTimelist[0];
          const latestBaseTime = latestTime.Basetime;
          const Validtime_array = new Date().toISOString().split(":");
          // '-' をすべて削除
          const Validtime_now = Validtime_array[0].replace(/-/g, "");
          let minute_now = Validtime_array[1].replace(/-/g, "");
          minute_now -= Number(minute_now) % 10;
          let index = 0;
          // 現在時間を検索
          for (index=0; index < latestTime.Validtime.length; index++) {
            if (Validtime_now == latestTime.Validtime[index]) {
              console.log(`Validtime_now[${index}](ugrd):${latestTime.Validtime[index]}`);
              break;
            }
          }
          // 気象レーダーの選択値を反映して最終Validtimeを決定
          const Validtime_fix = latestTime.Validtime[index+Number(time_index)]
          const lat_start = northwest.lat;
          const lon_start = northwest.lng;
          const lat_end = southeast.lat;
          const lon_end = southeast.lng;
          const dataParams = {
            elements: 'apcp',
            alt_surface: 0,
            basetime: latestBaseTime,
            validtime: Validtime_fix,
            lat_start: lat_start,
            lon_start: lon_start,
            lat_end: lat_end,
            lon_end: lon_end,
            minutes: minute_now,
            grid: 250
          };

          const responseApcp = await $fetch('/api/weather/data', { 
            method: 'GET',
            query: dataParams
          });
          if (responseApcp.status !== 200) {
            console.error(`$fetch error{status: ${responseApcp.status}}.`);
            isLoading.value = false;
            return;
          }
          const apcpData = responseApcp.data.Data[0].Contents;
          const height = parseInt(responseApcp.data.Data[0].RequestParameters.Height, 10);
          const width = parseInt(responseApcp.data.Data[0].RequestParameters.Width, 10);
          const stepHeight = (lat_start - lat_end) / height;
          const stepWidth = (lon_start - lon_end) / width;

          if (apcpData.length !== height * width ) {
            console.error('計算に失敗しました。高さ・横幅のデータが足りない可能性があります。');
            isLoading.value = false;
            return;
          }
        
          for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
              const index = i * width + j;
              let color = '';
              if(apcpData[index] <= 0){
                color = 'rgba(0, 0, 255, ' + 0 +')';
              }else if(apcpData[index] > 0 && apcpData[index] <= 2){
                apcpData[index] = Math.max(apcpData[index],0.3) ;
                color = 'rgba(0, 0, 255, ' + (apcpData[index]) +')';
              }else if(apcpData[index] > 2 && apcpData[index] <= 4){
                color = 'rgba(255, 255, 0, ' + (apcpData[index]) **  (apcpData[index]) * 0.1 +')';
              }else if(apcpData[index] > 4 ){
                color = 'rgba(255,0 , 0, ' + (apcpData[index]) **  (apcpData[index])* 0.001 +')';
              }
              const mapCell = [
                [lat_start - i * stepHeight, lon_start - j * stepWidth],
                [lat_start - (i + 1) * stepHeight, lon_start - (j + 1) * stepWidth],
              ];
              const rectangleIcon_obj = L.rectangle(mapCell, {
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                weight: 0,
              }).addTo(map);
              rectangleIconList.push(rectangleIcon_obj);
            }
          }
          isLoading.value = false;
        } else {
          await removeraincloud(map);
        }
      } catch (error) {
        console.error(`updateRainCloud error(${error.message})`);
        console.error('updateRainCloud error Stack trace:', error.stack);
        isLoading.value = false;
        return;
      }
    };

    // 風向・風量アイコン削除
    const removeairinfo = async (map) => {
      isLoading.value = true;
      // 描画されていない場合はなにもしない。
      if (allowIconList.length == 0) {
        console.log(`No draw airinfo:${allowIconList.length}`);
        isLoading.value = false;
        return;
      }
      for (let i =0; i < allowIconList.length; i++) {
        map.removeLayer(allowIconList[i]);
      }
      allowIconList = [];
      isLoading.value = false;
    };
    
    // 風向・風量アイコン表示
    const updateairinfo = async (checked, map, time_index) => {
      try {
        console.log(`風向・風量のチェック状態：${checked}`);
        if (checked) {
          isLoading.value = true;
          // 北西端、南東端の座標取得
          const bounds = map.getBounds();
          const northwest = bounds.getNorthWest();
          const southeast = bounds.getSouthEast();
 
          // 天候情報取得(ugrd(東西方向), vgrd(南北方向))
          // index
          const params = { elements: 'ugrd,vgrd' };
          const indexResponse = await $fetch('/api/weather/index', { 
            method: 'GET',
            query: params
          });
          if (indexResponse.status !== 200) {
            console.error(`$fetch error{status: ${indexResponse.status}}.`);
            isLoading.value = false;
            return;
          }
          const indexData = indexResponse.data;
          console.log(`indexData:${JSON.stringify(indexData)}`);
          // Validtime取得
          const Basetime = indexData.Index[0].Timelist[0].Basetime;
          const Validtime_array = new Date().toISOString().split(":");
          // '-' をすべて削除
          const Validtime_now = Validtime_array[0].replace(/-/g, "");
          let minute_now = Validtime_array[1].replace(/-/g, "");
          minute_now -= Number(minute_now) % 10;
          let index = 0;
          // 現在時間を検索
          for (index=0; index < indexData.Index[0].Timelist[0].Validtime.length; index++) {
            if (Validtime_now == indexData.Index[0].Timelist[0].Validtime[index]) {
              console.log(`Validtime_now[${index}](ugrd):${indexData.Index[0].Timelist[0].Validtime[index]}`);
              break;
            }
          }
          // 気象レーダーの選択値を反映して最終Validtimeを決定
          const Validtime_fix = indexData.Index[0].Timelist[0].Validtime[index+Number(time_index)]
          console.log(`Validtime_fix[${index+Number(time_index)}](ugrd):${Validtime_fix}`);
          
          // data
          const lat_start = northwest.lat;
          const lon_start = northwest.lng;
          const lat_end = southeast.lat;
          const lon_end = southeast.lng;
          const dataParams = {
            elements: 'ugrd,vgrd',
            alt_surface: 270,
            basetime: Basetime,
            validtime: Validtime_fix,
            lat_start: lat_start,
            lon_start: lon_start,
            lat_end: lat_end,
            lon_end: lon_end,
            minutes: minute_now,
            grid: 250
          };
          const dataResponse = await $fetch('/api/weather/data', { 
            method: 'GET',
            query: dataParams
          });
          if (dataResponse.status !== 200) {
            console.error(`$fetch error{status: ${dataResponse.status}}.`);
            isLoading.value = false;
            return;
          }
          const ugrd_vgrd_Data = dataResponse.data;
          air_info_list = calAirData(ugrd_vgrd_Data);
          // icon セット
          const arrow_html = (color, angle) => `
            <div style="
              justify-content: center;
              align-items: center;
              width: 30px;
              height: 30px;
              display: flex;
              font-size: 30px;
              text-align: center;
              opacity:0.6;
              color: ${color};
              -webkit-text-stroke: 2px #000000;
              text-stroke: 2px #000000;
              transform: rotate(${angle+90}deg);
            ">
              <p>➤</p>
            </div> `;
          let html = null;
          for (let i=0; i<air_info_list.length; i++) {
            if (air_info_list[i][4] <= 5) {
              // 風速が 5m/s 以下なら青
              html = arrow_html("#0000FF", air_info_list[i][5]);
            } else if (air_info_list[i][4] > 5 || air_info_list[i][4] <= 8 ) {
              // 風速が 5m/s 以上 8ms 以下なら黄色
              html = arrow_html("#FFFF00", air_info_list[i][5]);
            } else {
              // 風速が 8m/s 以下なら赤
              html = arrow_html("#FF0000", air_info_list[i][5]);
            }
            let allowIcon = L.divIcon({
              className: '',
              html: html,
              iconSize: [50, 50]
            });
            const allowlatlng = [];
            allowlatlng.push(air_info_list[i][0]);
            allowlatlng.push(air_info_list[i][1]);
            const allowIcon_obj = L.marker(allowlatlng, {icon: allowIcon}).addTo(map);
            allowIconList.push(allowIcon_obj);
          }
          isLoading.value = false;
        } else {
          await removeairinfo(map);
        }
      } catch {
        console.error(`updateairinfo error(${error.message})`);
        console.error('updateairinfo error Stack trace:', error.stack);
        isLoading.value = false;
        return;
      }
    };

    const updateLteInfo = async (checked, map) => {
      try {
        isLoading.value = true;
        await removeLteInfo(map);
        if(!checked) {
          isLoading.value = false;
          return;
        }

        if(Object.keys(file53Data).length === 0 || lte53Data === ""){
          isLoading.value = false;
          return;
        }
        // UTM座標系への変換（WGS84 -> UTMゾーン）
        const projJgd2000 = 'EPSG:6691';
        let projUtm = null;

        // 北東端、南西端の座標取得
        const bounds = map.getBounds();
        const northeast = bounds.getNorthEast();
        
        var southWest = bounds.getSouthWest(); // 左下の座標
        console.log(`southWest Longitude: ${southWest.lng}, Latitude: ${southWest.lat}`);
        
        // UTM座標系（例：ゾーン53、WGS84）
        const utmZone53 = 'EPSG:32653';
        const utmZone54 = 'EPSG:32654';

        // 変換：UTMからWGS84（緯度経度）
        const [lng54, lat54] = proj4(utmZone54, projJgd2000, [Number(file54Data.xllcorner), Number(file54Data.yllcorner)]);
        const [lng53, lat53] = proj4(utmZone53, projJgd2000, [Number(file53Data.xllcorner), Number(file53Data.yllcorner)]);
        if(southWest.lng - lng54 >= 0) {
          projUtm = 'EPSG:32654';
        } else if(southWest.lng - lng53 >= 0) {
          projUtm = 'EPSG:32653';
        } else {
          console.log("範囲外のデータが選択されました。");
          isLoading.value = false;
          return;
        }
      
        // 緯度経度をUTM座標系に変換
        const [utmX, utmY] = proj4(projJgd2000, projUtm, [southWest.lng, southWest.lat]);
        // deltaX と deltaY を if 文の外で宣言
        let deltaX, deltaY;

        // UTMゾーンに基づいて deltaX と deltaY を計算
        if (projUtm === 'EPSG:32653') {
          deltaX = utmX - file53Data.xllcorner;
          deltaY = utmY - file53Data.yllcorner;
        } else {
          deltaX = utmX - file54Data.xllcorner;
          deltaY = utmY - file54Data.yllcorner;
        }

        console.log(`deltaX: ${deltaX}`);
        console.log(`deltaY: ${deltaY}`);

        // 範囲外のデータをチェック
        if (deltaX < 0 || deltaY < 0) {
          console.log("範囲外のデータが選択されました。");
          isLoading.value = false;
          return;
        }

        let column, row;
        if(projUtm === 'EPSG:32653') {
          // グリッド内での列数・行数を求める
          column = Math.floor(deltaX / file53Data.cellsize);
          row = Math.floor(deltaY / file53Data.cellsize);
        } else {
          // グリッド内での列数・行数を求める
          column = Math.floor(deltaX / file54Data.cellsize);
          row = Math.floor(deltaY / file54Data.cellsize);
        }

        console.log(`column: ${column}`);
        console.log(`row: ${row}`);

        // 新しいグリッドセルの座標（東、北にそれぞれ50m移動）
        // 左端の座標保持
        let leftLatLonA = [southWest.lng, southWest.lat];
        let latLonA = leftLatLonA;
        let latLonB = turf.destination(latLonA, parseInt(file54Data.cellsize), 90, { units: 'meters' });
        latLonB = turf.destination(latLonB, parseInt(file54Data.cellsize), 0, { units: 'meters' }).geometry.coordinates;
        // 左端の列番号
        const orgColumn = column;

        while(true) {
          // gridDataのインデックスを計算
          if(projUtm === 'EPSG:32653') {
            if(lte53Data[row][column] === "1"){
              const rectangleIcon_obj = L.rectangle([[latLonA[1], latLonA[0]], [latLonB[1], latLonB[0]]], {
                color: "#1eff00",
                fillColor: "#1eff00",
                fillOpacity: 0.5,
                weight: 0,
              }).addTo(map);
              lteIconList.push(rectangleIcon_obj);
            }
          } else {
            if(lte54Data[row][column] === "1"){
              const rectangleIcon_obj = L.rectangle([[latLonA[1], latLonA[0]], [latLonB[1], latLonB[0]]], {
                color: "#1eff00",
                fillColor: "#1eff00",
                fillOpacity: 0.5,
                weight: 0,
              }).addTo(map);
              lteIconList.push(rectangleIcon_obj);
            }
          }

          if(latLonB[0] > northeast.lng && latLonB[1] > northeast.lat) {
            // 地図の右上まで描画
            break;
          }

          if(latLonB[0] > northeast.lng){
            // 地図の右端まで到達
            let deltaX, deltaY;
            if (projUtm === 'EPSG:32653') {
              // 左端の値更新
              leftLatLonA = turf.destination(leftLatLonA, parseInt(file53Data.cellsize), 0, { units: 'meters' });
            } else {
              leftLatLonA = turf.destination(leftLatLonA, parseInt(file54Data.cellsize), 0, { units: 'meters' });
            }
            latLonA = leftLatLonA;
            // グリッド内での列数・行数を求める
            column = orgColumn;
            row += 1;
          } else {
            latLonA = turf.destination(latLonA, parseInt(file54Data.cellsize), 90, { units: 'meters' });
            column += 1;
          }

          latLonB = turf.destination(latLonA, parseInt(file54Data.cellsize), 90, { units: 'meters' });
          latLonB = turf.destination(latLonB, parseInt(file54Data.cellsize), 0, { units: 'meters' });
          
          latLonA = latLonA.geometry.coordinates;
          latLonB = latLonB.geometry.coordinates;
            
        }
        isLoading.value = false;
      } catch(error) {
        console.error(`updateLteInfo error(${error.message})`);
        console.error('updateLteInfo error Stack trace:', error.stack);
        isLoading.value = false;
        return;
      }
    };

    const removeLteInfo = async (map) => {
      isLoading.value = true;
      // 描画されていない場合はなにもしない。
      if (lteIconList.length == 0) {
        isLoading.value = false;
        return;
      }
      for (let i =0; i < lteIconList.length; i++) {
        map.removeLayer(lteIconList[i]);
      }
      lteIconList = [];
      isLoading.value = false;
    };

    const updateFeatureChk = async function () {
      console.log(`feature checked: ${this.checked}`);
      await updatefeatureinfo(this.checked, props.map);
    };

    // 雨雲
    const updateRaincloudChk = async function () {
      console.log(`raincloud checked: ${this.checked}`);
      const rangWeatherRadar = wiRange.value;
      console.log(`weather_radar_rang now value: ${rangWeatherRadar.value}`);
      await updateRainCloud(this.checked, props.map, rangWeatherRadar.value);
    };

    // 風向・風量
    const updateAirfvChk = async function () {
      console.log(`airfv checked: ${this.checked}`);
      const rangWeatherRadar = wiRange.value;
      console.log(`weather_radar_rang now value: ${rangWeatherRadar.value}`);
      await updateairinfo(this.checked, props.map, rangWeatherRadar.value);
    };

    // 無線
    const updateLteChk = async function () {
      console.log(`lte checked: ${this.checked}`);
      await updateLteInfo(chkLte.value.checked, props.map);
    };

    // 気象レーダー
    const updateWeatherRadarRang = async function () {
      console.log(`weather_radar_rang change value: ${this.value}`);
      console.log(`raincloud checked: ${this.checked}`);
      // 雨量
      if (chkRaincloud.value.checked) {
        await removeraincloud(props.map);
        await updateRainCloud(chkRaincloud.value.checked, props.map, this.value);
      }
      // 風向・風量
      if (chkAirfv.value.checked) {
        await removeairinfo(props.map);
        await updateairinfo(chkAirfv.value.checked, props.map, this.value);
      }
    };

    // 地図移動ハンドラ(親コンポーネントにて地図移動完了を検知)
    watch(() => props.map_moveend, async (newData) => {
      console.log(`map moveend: ${newData}`);
      if (!newData) {
        // フラグ解除での変更では何もしない。
        return;
      }
      // 気象レーダ取得
      rang_weather_radar = document.getElementById(wi_range_id.value);
      console.log(`weather_radar_rang now value: ${rang_weather_radar.value}`);
      // 地物
      chk_feature = document.getElementById(chk_feature_id.value);
      if (chk_feature.checked) {
        console.log(`feature checked: ${chk_feature.checked}`);
      }
      // 雨量
      chk_raincloud = document.getElementById(chk_raincloud_id.value);
      if (chk_raincloud.checked) {
        console.log(`feature checked: ${chk_raincloud.checked}`);
        await removeraincloud(props.map);
        await updateRainCloud(chk_raincloud.checked, props.map, rang_weather_radar.value);
      }
      // 無線
      chk_lte = document.getElementById(chk_lte_id.value);
      if(chk_lte.checked) {
        await removeLteInfo(props.map);
        await updateLteInfo(chk_lte.checked, props.map);
      }
      
      // 風向き・風量
      chk_airfv = document.getElementById(chk_airfv_id.value);
      if (chk_airfv.checked) {
        console.log(`airfv checked: ${chk_airfv.checked}`);
        await removeairinfo(props.map);
        await updateairinfo(chk_airfv.checked, props.map, rang_weather_radar.value);
      }
      Weather_Changeed.value = false;
      emit('Weather_Changeed', Weather_Changeed);
    });

    // チェックボックスイベントハンドラ登録
    chkFeature.value.addEventListener("click", updateFeatureChk);
    chkRaincloud.value.addEventListener("click", updateRaincloudChk);
    chkAirfv.value.addEventListener("click", updateAirfvChk);
    chkLte.value.addEventListener("click", updateLteChk);
    wiRange.value.addEventListener("change", updateWeatherRadarRang);
    isDisabled.value = false;
    emit('MapLayerControl_Mounted', 'mapLayerControl OnMount ended');
    console.log("mapLayerControl ended");
    
    return { isDisabled, chkFeature, chkRaincloud, chkAirfv, chkLte, wiRange };
  }); 
</script>

<style>
.layer-control {
  font-size: 0.8rem;
  line-height: 2em;
  margin: 0px;
  padding: 10px 0px 10px 10px;
  border-width: 1px;
  border-style: solid;
  border-color: #000000;
  background-color: #FFFFFF;
  width: 120px;
  height: 500px;
}

.wi_range_container {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.wi_range {
  appearance: slider-vertical;
  width: 20px;
  height: 230px;
  margin: 0px;
  writing-mode: vertical-lr;
}

.wi_range_labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 230px;
  margin-left: 10px;
}

.wi_range_labels span {
  font-size: 0.75rem;
  white-space: nowrap;
}

</style>
