<template>
  <div class="drn_form__header">
    <div class="drn_form__title">高度・幅設定</div>
  </div>
  <dl class="c-configuredInfomationInWizard">
    <div>
      <dt class="e-configuredInformationTitle">飛行目的：</dt>
      <dd class="e-configuredInformationValue">{{ purpose }}</dd>
    </div>
    <div>
      <dt class="e-configuredInformationTitle">モデル名：</dt>
      <dd class="e-configuredInformationValue">[ {{ joinedType }} ]</dd>
    </div>
    <div>
      <dt class="e-configuredInformationTitle">航路：</dt>
      <dd class="e-configuredInformationValue">{{ routeName }}</dd>
    </div>
    <div>
      <dt class="e-configuredInformationTitle">最大落下範囲：</dt>
      <dd class="e-configuredInformationValue">{{ fallToleranceRange }}</dd>
    </div>
  </dl>
  <!-- 詳細情報 -->
  <div id="content" class="b-routeCutPlaneSetting">
    <h2 class="u-invisible">切断面設定</h2>
    <!-- 最大落下範囲切断設定地図 -->
    <h3 class="u-invisible">最大落下範囲切断設定地図</h3>
    <CreateAirway
      @update-data="handlerUpdateValue"
      @isJunctionSetting="handlerIsJunctionSetting"
      :message="fallToleranceRangeId"
      :stepNo="stepNo"
      :aircrafts="aircrafts"
    />
 </div>
</template>

<script>
import "leaflet/dist/leaflet.css";
import { ref } from "vue";
import CreateAirway from "~/components/map/createAirway.vue";

const isJunctionSetting = ref(false);

export default {
  components: {
    CreateAirway
  },
  props: ['rangeData', 'stepNo'],
  data() {
    return {
      corridorList: {
      "airwayId": "airway_id_A",
      "airwayName": "",
      "flightPurpose": "",
      "createdAt": getCurrentDate(),
      "updatedAt": getCurrentDate(),
      "airwayJunctions": [],
      "airwaySections": [],
      "determination_id": "",
      "despersion_nodes": "",
      },
      
      purpose: this.rangeData.purpose,   
      type: this.rangeData.type,  
      routeName: this.rangeData.routeName,  
      fallToleranceRange: this.rangeData.fallToleranceRange,  
      fallToleranceRangeId: this.rangeData.fallToleranceRangeId,
      aircrafts: this.rangeData.aircrafts,
      selectedModels: this.rangeData.selectedModels,
      
      isJunctionSetting: isJunctionSetting.value,
      stepNo: this.stepNo,
    };
  },
  computed: {
    joinedType() {
      return this.selectedModels.join();
    }
  },
  methods: {
    handleCorridorDataAdded() {
      this.$emit('update:corridorData', this.corridorList);
    },
    handlerUpdateValue(newValue) {
      // 子コンポーネントから受け取ったデータでcorridorData(JSON)を更新
      if (Object.keys(newValue).length  !== 0) {
        const child_corridor_id = `airway_id_${new Date().toISOString()}`;
        this.corridorList.airwayId = child_corridor_id;
        this.corridorList.airwayJunctions = [];
        let pointIndex = 1;
        
        this.corridorList.airwayName = this.routeName;
        this.corridorList.flightPurpose = this.purpose;

        this.corridorList.determination_id = newValue.determination_id;
        this.corridorList.despersion_nodes = newValue.despersion_nodes;

        for (let i=0; i < newValue.corridor_points.length; i++) {
          const airwayJunction = {
            "airwayJunctionId": "",
            "airwayJunctionName": "",
            "type": "",
            "airways": []
          };
          const airway = {
            "airway": {
              "geometry": {
                "type": "",
                "coordinates": []
              },
              "type": ""
            },
            "deviation": {
              "geometry": {
                "type": "",
                "coordinates": []
              },
            }
          };

          // [緯度,経度,高さ] を [経度,緯度,高さ] に変換
          let pointList = [];
          newValue.corridor_points[i].LDN_coordinates.forEach((point) => {
            pointList.push([point[1], point[0], point[2]]);
          })

          let pointListAirway = [];
          newValue.corridor_points[i].LDN_airway_coordinates.forEach((point) => {
            pointListAirway.push([point[1], point[0], point[2]]);
          })

          const airway_junction_id = `airway_junction_id_${pointIndex}_${new Date().toISOString()}`
          airway.airway.geometry.coordinates = pointListAirway;
          airway.airway.type = "Polygon";
          airway.deviation.geometry.coordinates = pointList;
          airway.deviation.type = "Polygon";
          airwayJunction.airwayJunctionId = airway_junction_id;
          airwayJunction.airwayJunctionName = newValue.corridor_points[i].LDN_name;
          airwayJunction.type = "Feature";
          airwayJunction.airways.push(airway);
          this.corridorList.airwayJunctions.push(airwayJunction);
          pointIndex++;
        }
        const airwayJunction_ids_list = [];
        this.corridorList.airwaySections = [];
        for (let j=0; j < this.corridorList.airwayJunctions.length-1; j++) {
          const airwayJunction_ids = [
            this.corridorList.airwayJunctions[j].airwayJunctionId,
            this.corridorList.airwayJunctions[j+1].airwayJunctionId,
          ];
          airwayJunction_ids_list.push(airwayJunction_ids);
        }

        let sectionIndex = 1;
        for (let k=0; k < newValue.corridor_sections.length; k++) {
          const airwaySection = {
            "airwaySectionId": "",
            "airwaySectionName": "",
            "airwayJunctionIds": []
          }
          airwaySection.airwaySectionId = `id_${sectionIndex}_${new Date().toISOString()}`;
          airwaySection.airwaySectionName = newValue.corridor_sections[k];
          airwaySection.airwayJunctionIds = airwayJunction_ids_list[k];
          this.corridorList.airwaySections.push(airwaySection);
          sectionIndex++;
        }
      } else {
        this.corridorList = {}
      }
      this.handleCorridorDataAdded();
    },handlerIsJunctionSetting(b) {
      isJunctionSetting.value = b;
      this.$emit('update:junctionSetting', isJunctionSetting.value);
    }
  }
};

function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

</script>

