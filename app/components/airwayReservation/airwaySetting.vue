<template>
  <!-- 設定済み情報 -->
  <div class="drn_form__header">
    <div class="drn_form__title">航路選択</div>
  </div>
  <!-- エラー表示 -->
  <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
  <!-- 詳細情報 -->
  <div id="content" class="b-singleColumnHasTab">
    <div v-if="selectedButton === 'list'">
      <!-- リストから探す -->
      <section class="b-tabContainer">
        <div class="b-table">
          <div class="c-previewTableContainer">
            <div class="pull-down-scroll">
              <div>
                <div class="c-formItemContainer" style="align-items: flex-start;">
                  <div class="delete-col"></div>
                  <div class="c-formItem-spacer delete-sp"></div>

                  <div class="c-formItem">
                    <label class="e-fieldLabel">飛行エリア</label>
                    <div class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined">
                      <div class="v-field__field" data-no-activator="">
                        <div class="v-field__input" data-no-activator="">
                          <select class="full-width-select" v-model="selectedAreaName">
                            <option value="---">---</option>
                            <option v-for="item in (areaItems?.areas || [])" :key="item.name" :value="item.name">
                              {{ item.name }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div class="v-field__append-inner">
                        <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width:none;">
                      </div>
                      <div class="v-field__outline">
                        <div class="v-field__outline__start"></div>
                        <div class="v-field__outline__end"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <template v-for="ri in airwayPathRenderItems" :key="ri.key">
                  <!-- 航路セット -->
                  <div
                    v-if="ri.type === 'set'"
                    class="c-formItemContainer route-set-row"
                    :class="{ 'is-not-first': airwayPathSets.length > 1 && ri.idx > 0 }"
                    style="align-items: flex-start;"
                  >
                    <div class="delete-col">
                      <div
                        class="route-point-arrow-line"
                        v-if="airwayPathSets.length > 1 && ri.idx > 0"
                        aria-hidden="true"
                      ></div>

                      <button
                        type="button"
                        class="button btn-circle"
                        @click="removePathSet(ri.idx)"
                        v-show="ri.idx > 0"
                        aria-label="このセットを削除"
                      >
                        ー
                      </button>
                    </div>

                    <div class="c-formItem-spacer delete-sp"></div>

                    <!-- 航路（飛行目的を上に追加） -->
                    <div class="c-formItem">
                      <div
                        class="route-point-arrow-line field-width route-point-spacer"
                        v-if="airwayPathSets.length > 1 && ri.idx > 0"
                        aria-hidden="true"
                      ></div>
                      <!-- 飛行目的：航路の上 -->
                      <label class="e-fieldLabel">飛行目的</label>
                      <div class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined">
                        <div class="v-field__field">
                          <div class="v-field__input">
                            <select
                              class="full-width-select"
                              v-model="ri.set.purpose"
                              @change="onSelectPurpose(ri.idx)"
                            >
                              <option value="---">---</option>
                              <option v-for="purpose in purposeOptions" :key="purpose" :value="purpose">
                                {{ purpose }}
                              </option>
                            </select>
                          </div>
                        </div>
                        <div class="v-field__append-inner">
                          <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width: none;">
                        </div>
                        <div class="v-field__outline">
                          <div class="v-field__outline__start"></div>
                          <div class="v-field__outline__end"></div>
                        </div>
                      </div>

                      <div style="height: 8px;"></div>
                      <label class="e-fieldLabel">航路</label>
                      <div class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined">
                        <div class="v-field__overlay"></div>
                        <div class="v-field__loader">
                          <div class="v-progress-linear v-theme--light v-locale--is-ltr" role="progressbar"
                            aria-hidden="true" aria-valuemin="0" aria-valuemax="100"
                            style="top: 0px; height: 0px; --v-progress-linear-height: 2px;">
                            <div class="v-progress-linear__background"></div>
                            <div class="v-progress-linear__buffer" style="width: 0%;"></div>
                            <div class="v-progress-linear__indeterminate">
                              <div class="v-progress-linear__indeterminate long"></div>
                              <div class="v-progress-linear__indeterminate short"></div>
                            </div>
                          </div>
                        </div>

                        <div class="v-field__field">
                          <div class="v-field__input">
                            <select
                              class="full-width-select"
                              v-model="ri.set.airwayId"
                              @change="onSelectAirway(ri.idx)"
                            >
                              <option value="---">---</option>
                              <option v-for="opt in allRouteOptions[ri.idx] || []" :key="opt.id" :value="opt.airwayId">
                                {{ opt.airwayName }}
                              </option>
                            </select>
                          </div>
                        </div>

                        <div class="v-field__append-inner">
                          <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width: none;">
                        </div>
                        <div class="v-field__outline">
                          <div class="v-field__outline__start"></div>
                          <div class="v-field__outline__end"></div>
                        </div>
                      </div>
                    </div>

                    <div class="c-formItem-spacer"></div>

                    <!-- 航路点（開始／終了：上下） -->
                    <div class="c-formItem">
                      <div class="route-point-arrow-line field-width" v-if="airwayPathSets.length > 1 && ri.idx > 0">
                      </div>

                      <label class="e-fieldLabel">
                        <span class="label-inner" :class="{ 'is-hidden': ri.idx !== 0 }">
                          <img src="/assets/css/img/dummyImg/svg_uaslSectionStart.svg" width="15" height="15">
                          航路点 離陸
                        </span>
                      </label>

                      <!-- 開始点 -->
                      <div class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined">
                        <div class="v-field__overlay"></div>
                        <div class="v-field__loader">
                          <div class="v-progress-linear v-theme--light v-locale--is-ltr" role="progressbar"
                            aria-hidden="true" aria-valuemin="0" aria-valuemax="100"
                            style="top: 0px; height: 0px; --v-progress-linear-height: 2px;">
                            <div class="v-progress-linear__background"></div>
                            <div class="v-progress-linear__buffer" style="width: 0%;"></div>
                            <div class="v-progress-linear__indeterminate">
                              <div class="v-progress-linear__indeterminate long"></div>
                              <div class="v-progress-linear__indeterminate short"></div>
                            </div>
                          </div>
                        </div>

                        <div class="v-field__field">
                          <div class="v-field__input">
                            <select
                              class="full-width-select"
                              v-model="ri.set.junctionStart"
                              @change="onSelectStart(ri.idx)"
                            >
                              <option value="---">---</option>
                              <option
                                v-for="opt in junctionNamesForStart(ri.idx)"
                                :key="opt.id"
                                :value="opt.id"
                              >
                                {{ opt.name }}
                              </option>
                            </select>
                          </div>
                        </div>

                        <div class="v-field__append-inner">
                          <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width: none;">
                        </div>
                        <div class="v-field__outline">
                          <div class="v-field__outline__start"></div>
                          <div class="v-field__outline__end"></div>
                        </div>
                      </div>
                      <div class="route-gap"></div>
                      <label class="e-fieldLabel">
                        <span class="label-inner" :class="{ 'is-hidden': ri.idx !== airwayPathSets.length - 1 }">
                          <img src="/assets/css/img/dummyImg/svg_uaslSectionGoal.svg" width="15" height="15">
                          航路点 着陸
                        </span>
                      </label>
                      <!-- 終了点 -->
                      <div class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined">
                        <div class="v-field__overlay"></div>
                        <div class="v-field__loader">
                          <div class="v-progress-linear v-theme--light v-locale--is-ltr" role="progressbar"
                            aria-hidden="true" aria-valuemin="0" aria-valuemax="100"
                            style="top: 0px; height: 0px; --v-progress-linear-height: 2px;">
                            <div class="v-progress-linear__background"></div>
                            <div class="v-progress-linear__buffer" style="width: 0%;"></div>
                            <div class="v-progress-linear__indeterminate">
                              <div class="v-progress-linear__indeterminate long"></div>
                              <div class="v-progress-linear__indeterminate short"></div>
                            </div>
                          </div>
                        </div>

                        <div class="v-field__field">
                          <div class="v-field__input">

                            <select
                              class="full-width-select"
                              v-model="ri.set.junctionEnd"
                              @change="onSelectEnd(ri.idx)"
                            >
                              <option value="---">---</option>
                              <option
                                v-for="opt in junctionNamesForEnd(ri.idx)"
                                :key="opt.id"
                                :value="opt.id"
                              >
                                {{ opt.name }}
                              </option>
                            </select>
                          </div>
                        </div>

                        <div class="v-field__append-inner">
                          <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width: none;">
                        </div>
                        <div class="v-field__outline">
                          <div class="v-field__outline__start"></div>
                          <div class="v-field__outline__end"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="c-formItemContainer route-separator-row" style="align-items:flex-start;">
                    <div class="delete-col"></div>
                    <div class="c-formItem-spacer delete-sp"></div>

                    <!-- 航路プルダウン列と同じ位置から始まる -->
                    <div class="route-separator field-width e-fieldLabel">
                      内視界飛行
                    </div>

                    <!-- 右側（航路点列）まで揃えたいなら spacer を入れる（任意） -->
                    <!-- <div class="c-formItem-spacer"></div> -->
                  </div>
                </template>

                <div class="c-formItemContainer add-path-set-row">
                  <div class="delete-col"></div>
                  <div class="c-formItem-spacer delete-sp"></div>
                  <div class="add-path-set-center">
                    <button type="button" class="btn-circle" @click="addPathSet">＋</button>
                  </div>
                </div>

                <!-- 離着陸場 サブタイトル -->
                <div class="field-header port-subtitle-row">
                  <div class="c-formItemContainer">
                    <div class="c-formItem placeLabel">離着陸場</div>
                  </div>
                  <label class="bring-in-checkbox">
                    <input
                      type="checkbox"
                      :checked="!isPortNeeded"
                      @change="setPortNeeded(!$event.target.checked)"
                    />
                    不要
                  </label>
                </div>

                <div class="c-formItemContainer">
                  <div class="delete-col"></div>
                  <div class="c-formItem-spacer delete-sp"></div>

                  <div class="c-formItem">
                    <label class="e-fieldLabel">
                      <img src="/assets/css/img/dummyImg/dummy_circle-dot-regular.svg" width="15" height="15">離陸場
                    </label>
                    <div
                      class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined v-theme--light v-locale--is-ltr"
                      role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="v-menu-23"
                      :style="{ backgroundColor: !isPortNeeded ? 'lightgray' : '' }"
                    >
                      <div class="v-field__overlay"></div>
                      <div class="v-field__loader">
                        <div class="v-progress-linear v-theme--light v-locale--is-ltr" role="progressbar"
                          aria-hidden="true" aria-valuemin="0" aria-valuemax="100"
                          style="top: 0px; height: 0px; --v-progress-linear-height: 2px;">
                          <div class="v-progress-linear__background"></div>
                          <div class="v-progress-linear__buffer" style="width: 0%;"></div>
                          <div class="v-progress-linear__indeterminate">
                            <div class="v-progress-linear__indeterminate long"></div>
                            <div class="v-progress-linear__indeterminate short"></div>
                          </div>
                        </div>
                      </div>
                      <div class="v-field__field" data-no-activator="">
                        <div class="v-field__input" data-no-activator="">
                          <select
                            class="full-width-select"
                            v-model="selectedDeparturePort"
                            @change="selectDeparturePort"
                            :disabled="!isPortNeeded"
                          >
                            <option value="---">---</option>
                            <option v-for="port in sortedDeparturePorts" :key="port" :value="port">{{ port }}</option>
                          </select>
                        </div>
                      </div>
                      <div class="v-field__append-inner">
                        <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width: none;">
                      </div>
                      <div class="v-field__outline">
                        <div class="v-field__outline__start"></div>
                        <div class="v-field__outline__end"></div>
                      </div>
                    </div>
                  </div>

                  <div class="c-formItem-spacer"></div>

                  <div class="c-formItem">
                    <label class="e-fieldLabel">
                      <img src="/assets/css/img/dummyImg/dummy_circle-dot-regular.svg" width="15" height="15">着陸場
                    </label>
                    <div
                      class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined v-theme--light v-locale--is-ltr"
                      role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="v-menu-23"
                      :style="{ backgroundColor: !isPortNeeded ? 'lightgray' : '' }"
                    >
                      <div class="v-field__overlay"></div>
                      <div class="v-field__loader">
                        <div class="v-progress-linear v-theme--light v-locale--is-ltr" role="progressbar"
                          aria-hidden="true" aria-valuemin="0" aria-valuemax="100"
                          style="top: 0px; height: 0px; --v-progress-linear-height: 2px;">
                          <div class="v-progress-linear__background"></div>
                          <div class="v-progress-linear__buffer" style="width: 0%;"></div>
                          <div class="v-progress-linear__indeterminate">
                            <div class="v-progress-linear__indeterminate long"></div>
                            <div class="v-progress-linear__indeterminate short"></div>
                          </div>
                        </div>
                      </div>
                      <div class="v-field__field" data-no-activator="">
                        <div class="v-field__input" data-no-activator="">
                          <select
                            class="full-width-select"
                            v-model="selectedArrivalPort"
                            @change="selectArrivalPort"
                            :disabled="!isPortNeeded"
                          >
                            <option value="---">---</option>
                            <option v-for="port in sortedArrivalPorts" :key="port" :value="port">{{ port }}</option>
                          </select>
                        </div>
                      </div>
                      <div class="v-field__append-inner">
                        <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width: none;">
                      </div>
                      <div class="v-field__outline">
                        <div class="v-field__outline__start"></div>
                        <div class="v-field__outline__end"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ドローン機体 -->
                <div class="field-header drone-section-header">
                  <div class="c-formItemContainer">
                    <div class="c-formItem placeLabel">ドローン機体</div>
                  </div>

                  <label class="bring-in-checkbox">
                    <input
                      type="checkbox"
                      v-model="isAircraftBringIn"
                      @change="onChangeAircraftBringIn"
                    />
                    ドローン機体持ち込み
                  </label>
                </div>

                <div class="c-formItemContainer">
                  <div class="delete-col"></div>
                  <div class="c-formItem-spacer delete-sp"></div>

                  <div class="c-formItem">
                    <label class="e-fieldLabel">メーカー</label>
                    <div
                      class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined v-theme--light v-locale--is-ltr"
                      role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="v-menu-23">
                      <div class="v-field__overlay"></div>
                      <div class="v-field__loader">
                        <div class="v-progress-linear v-theme--light v-locale--is-ltr" role="progressbar"
                          aria-hidden="true" aria-valuemin="0" aria-valuemax="100"
                          style="top: 0px; height: 0px; --v-progress-linear-height: 2px;">
                          <div class="v-progress-linear__background"></div>
                          <div class="v-progress-linear__buffer" style="width: 0%;"></div>
                          <div class="v-progress-linear__indeterminate">
                            <div class="v-progress-linear__indeterminate long"></div>
                            <div class="v-progress-linear__indeterminate short"></div>
                          </div>
                        </div>
                      </div>

                      <div class="v-field__field" data-no-activator="">
                        <div class="v-field__input" data-no-activator="">
                          <select class="full-width-select"
                                  v-model="selectedMaker"
                                  @change="onChangeMaker">
                            <option value="---">---</option>
                            <option v-for="maker in makerOptions" :key="maker" :value="maker">
                              {{ maker }}
                            </option>
                          </select>
                        </div>
                      </div>

                      <div class="v-field__append-inner">
                        <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width: none;">
                      </div>
                      <div class="v-field__outline">
                        <div class="v-field__outline__start"></div>
                        <div class="v-field__outline__end"></div>
                      </div>
                    </div>
                  </div>

                  <div class="c-formItem-spacer"></div>

                  <div class="c-formItem">
                    <label class="e-fieldLabel">モデル</label>
                    <div
                      class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined v-theme--light v-locale--is-ltr"
                      role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="v-menu-23">
                      <div class="v-field__overlay"></div>
                      <div class="v-field__loader">
                        <div class="v-progress-linear v-theme--light v-locale--is-ltr" role="progressbar"
                          aria-hidden="true" aria-valuemin="0" aria-valuemax="100"
                          style="top: 0px; height: 0px; --v-progress-linear-height: 2px;">
                          <div class="v-progress-linear__background"></div>
                          <div class="v-progress-linear__buffer" style="width: 0%;"></div>
                          <div class="v-progress-linear__indeterminate">
                            <div class="v-progress-linear__indeterminate long"></div>
                            <div class="v-progress-linear__indeterminate short"></div>
                          </div>
                        </div>
                      </div>

                      <div class="v-field__field" data-no-activator="">
                        <div class="v-field__input" data-no-activator="">
                          <select class="full-width-select"
                                  v-model="selectedModelNumber"
                                  @change="onChangeModelNumber">
                            <option value="---">---</option>
                            <option v-for="m in modelNumberOptions" :key="m" :value="m">
                              {{ m }}
                            </option>
                          </select>
                        </div>
                      </div>

                      <div class="v-field__append-inner">
                        <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width: none;">
                      </div>
                      <div class="v-field__outline">
                        <div class="v-field__outline__start"></div>
                        <div class="v-field__outline__end"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="c-formItemContainer">
                  <div class="delete-col"></div>
                  <div class="c-formItem-spacer delete-sp"></div>

                  <!-- 左：機体名（持ち込みONなら“見えない”） -->
                  <div
                    class="c-formItem"
                    :class="{ 'keep-space-hidden': isAircraftBringIn }"
                    :aria-hidden="isAircraftBringIn ? 'true' : 'false'"
                  >
                    <label class="e-fieldLabel">機体名</label>
                    <div class="field-size v-field v-field--appended v-field--center-affix v-field--no-label v-field--variant-outlined">
                      <div class="v-field__field">
                        <div class="v-field__input">
                          <select
                            class="full-width-select"
                            v-model="selectedAircraftName"
                            @change="onChangeAircraftName"
                            :disabled="isAircraftBringIn"
                            :tabindex="isAircraftBringIn ? -1 : 0"
                          >
                            <option value="---">---</option>
                            <option v-for="n in aircraftNameOptions" :key="n" :value="n">{{ n }}</option>
                          </select>
                        </div>
                      </div>
                      <div class="v-field__append-inner">
                        <img src="/assets/css/img/angle-down-solid.svg" width="15" height="15" style="max-width:none;">
                      </div>
                      <div class="v-field__outline">
                        <div class="v-field__outline__start"></div>
                        <div class="v-field__outline__end"></div>
                      </div>
                    </div>
                  </div>

                  <div class="c-formItem-spacer"></div>

                  <!-- 右：DIPS登録記号（持ち込みOFFなら“見えない”） -->
                  <div
                    class="c-formItem"
                    :class="{ 'keep-space-hidden': !isAircraftBringIn }"
                    :aria-hidden="!isAircraftBringIn ? 'true' : 'false'"
                  >
                    <label class="e-fieldLabel">DIPS登録記号</label>
                    <div class="field-size v-field v-field--center-affix v-field--no-label v-field--variant-outlined">
                      <div class="v-field__field">
                        <div class="v-field__input">
                          <input
                            type="text"
                            v-model="inputedAircraftId"
                            placeholder="DIPS登録記号を入力してください（任意）"
                            @change="updateBasicInfomation"
                            :disabled="!isAircraftBringIn"
                            :tabindex="isAircraftBringIn ? 0 : -1"
                          />
                        </div>
                      </div>
                      <div class="v-field__outline">
                        <div class="v-field__outline__start"></div>
                        <div class="v-field__outline__end"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <dl class="c-tablePreview">
              <div>
                <dt class="u-invisible">選択済み航路地図画像</dt>
                <div class="e-pageTitle subTitle" style="margin-top: -20px; margin-bottom: 20px;">{{
                  this.selectedAirwayName }}
                </div>
                <dd class="map-container-dd">
                  <MapComponent
                    v-if="airwayData && droneData"
                    :stepNo="stepNo"
                    :airwayId="selectedAirwayIds"
                    :airwayData="airwayData"
                    :section="sectionRange"
                    :showCheckBox="true"
                    :showLegend="true"
                    :showMarker="true"
                    :departurePort="departurePortDegrees"
                    :arrivalPort="arrivalPortDegrees"
                    :departureSectionPoint="departureSectionDegrees"
                    :arrivalSectionPoint="arrivalSectionDegrees"
                    :selectedAirwayIds="selectedAirwayIds"
                    :selectedSectionLine="selectedSectionLine"
                    :selectedSegments="selectedSegments"
                    :area="selectedAreaName"
                    :areaInfo="areaItems"
                    :suppressFitBounds="suppressFitBounds"
                    :droneData="droneData"
                    @airwaysUpdated="handleAirwaysUpdated"
                    @ownAirwaysUpdated="handleOwnAirwaysUpdated"
                    @update:isEndIdFirst="handleIsEndIdFirst"
                    @portsUpdated="handlePortsUpdated"
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import MapComponent from '@/components/map/selectAirwaySectionPortFromList.vue';
import * as turf from "@turf/turf";

export default {
  setup() {
    const { portHashMap, selectedAirwayData, junctionNameMap } = useNewReservationCache();
    return { portHashMap, selectedAirwayData, junctionNameMap };
  },
  components: {
    MapComponent,
  },
  props: {
    stepNo: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      selectedButton: 'list', // 初期状態でリストビューを選択
      selectedAirwayId: '---', 
      selectedAirwayName: '---', 
      selectedSection: null, 
      selectedDepartureSection: '---',
      selectedArrivalSection: '---',
      selectedDeparturePort: '---',
      selectedArrivalPort: '---',
      selectedJunctions: [],
      airwayData: { airway: { airways: [] } },          // キャッシュ（蓄積・自社＋他社）
      ownAirwayData: { airway: { airways: [] } },        // 自社航路のみ（GET /uasl-list 由来）
      visibleAirwayData: { airway: { airways: [] } },   // 表示領域内（毎回入れ替え）
      visibleRoutes: [],
      routes: [],
      filteredRoutes: [],
      matchingJunctionNames: [],
      sortedDeparturePorts:[],
      sortedArrivalPorts:[],
      departurePortDegrees:[],
      arrivalPortDegrees:[],
      droneData: null,
      droneItems: [],
      uniqueTypes: [],
      selectedType: '---',
      selectedLength: '---',
      filteredModels: [],
      selectedModel: '---',
      lengthOptions: ['500mm未満', '500mm以上950mm未満', '950mm以上'],

      airway: {
        aircraftId: '',
        aircraftRemoteId: '',
        airwayId: [],
        purpose: '',
        type: '',
        aircraftInfoId:'',
        aircraftInfo:'',
        airwayName: [],
        section: '',
        departurePort: '',
        arrivalPort: '',
        departurePortId: '',
        arrivalPortId: '',
        junctionList: [],
        departurePortDegrees: [],
        arrivalPortDegrees: [],
        isEndIdFirst: false,
        stepNo: this.stepNo,
      },
      
      purposeOptions: ['物資運搬', '送電線点検', '河川監視', '山岳監視', 'その他'],
      portData: null,
      aircraftData: null,
      operatorData: null,
      isEndIdFirst: false,

      isPortNeeded: true,
      isAircraftNeeded: true,

      selectedDepartureAirwayId: '---',
      selectedArrivalAirwayId: '---',
      selectedDepartureAirwayName: '---',
      selectedArrivalAirwayName: '---',
      departureJunctionNames: [],
      arrivalJunctionNames: [],
      errorMessage: '',
      currentAirwayId: '',
      departureSectionDegrees: [],
      arrivalSectionDegrees: [],
      airwayPathSets: [
        { purpose: '---', airwayId: '---', airwayName: '---', junctionStart: '---', junctionEnd: '---', junctionNames: [] }
      ],
      selectedAreaName: '---',
      areaItems: { areas: [] },
      selectedMaker: '---',
      selectedModelNumber: '---',
      selectedAircraftName: '---',
      isAircraftBringIn: false,
      inputedAircraftId: '',
      suppressFitBounds: false,
    };
  },
  computed: {
    sectionIds() {
      const parts = (this.airwayPathSets || []).flatMap(s => [
        s?.junctionStart ?? '---',
        s?.junctionEnd ?? '---',
      ]);
      return parts.join(',');
    },
    sectionNames() {
      const parts = (this.airwayPathSets || []).flatMap(s => [
        this.junctionNameById(s?.airwayId, s?.junctionStart) ?? '---',
        this.junctionNameById(s?.airwayId, s?.junctionEnd) ?? '---',
      ]);
      return parts.join(',');
    },
    // 互換維持：外部に見せる section は名前列
    section() {
      return this.sectionNames;
    },
    sectionRange() {
      return this.selectedDepartureSection + ' ~ ' + this.selectedArrivalSection;
    },
    // 先頭/末尾セット（PortやMap用）
    firstSet() { return this.airwayPathSets[0]; },
    lastSet() { return this.airwayPathSets[this.airwayPathSets.length - 1]; },

    // 全選択航路の droneList の積集合
    // 自社航路（GET /uasl-list 由来の ownAirwayData）のみを使用して絞り込む
    allowedAircraftInfoIds() {
      const ownAirways = this.ownAirwayData?.airway?.airways || [];

      const lists = this.airwayPathSets
        .map(s => ownAirways.find(a => a.airwayId === s.airwayId))
        // 自社航路（GET /uasl-list）に存在しない航路ID（他社航路）は除外
        .filter(a => a != null)
        .map(a => Array.isArray(a.droneList) ? a.droneList : []);

      // 自社航路が1本も選ばれていない
      if (lists.length === 0) return [];

      // AND（積集合）
      return lists.reduce((acc, cur) => acc.filter(id => cur.includes(id)));
    },
    selectableTypes() {
      const aircraft = this.droneItems?.aircraft || [];
      const ids = Array.isArray(this.allowedAircraftInfoIds) ? this.allowedAircraftInfoIds : [];

      // 片側も未選択なら空配列にして「選べない」状態にする
      if (ids.length === 0) return [];

      const types = aircraft
        .filter(a => ids.includes(a.aircraftInfoId))
        .map(a => a.type);

      return [...new Set(types)];
    },
    // すべてのセットから選択された航路ID（重複排除）
    selectedAirwayIds() {
      const ids = this.airwayPathSets
        .map(s => s.airwayId)
        .filter(id => id && id !== '---');
      return [...new Set(ids)];
    },
    selectedAirwayIdsRaw() {
      return this.airwayPathSets
        .map(s => s.airwayId)
        .filter(id => id && id !== '---');
    },
    // 選択済み航路点を順に結ぶ座標配列
    selectedSectionLine() {
      const pts = [];
      const pushIfNew = (p) => {
        const last = pts[pts.length - 1];
        if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
      };

      this.airwayPathSets.forEach((set) => {
        if (!set || !set.airwayId || set.airwayId === '---') return;

        if (set.junctionStart && set.junctionStart !== '---') {
          const pStart = this.computeSectionCenter(set.airwayId, set.junctionStart);
          if (pStart) pushIfNew(pStart);
        }
        if (set.junctionEnd && set.junctionEnd !== '---') {
          const pEnd = this.computeSectionCenter(set.airwayId, set.junctionEnd);
          if (pEnd) pushIfNew(pEnd);
        }
      });

      return pts;
    },
    selectedSegments() {
      const segs = [];

      this.airwayPathSets.forEach((set) => {
        if (!set || set.airwayId === '---') return;
        const hasStart = set.junctionStart && set.junctionStart !== '---';
        const hasEnd = set.junctionEnd && set.junctionEnd !== '---';
        if (!hasStart || !hasEnd) return;

        const pts = this.computePointsAlongAirway(set.airwayId, set.junctionStart, set.junctionEnd);
        if (Array.isArray(pts) && pts.length >= 2) {
          segs.push({
            airwayId: set.airwayId,
            fromName: set.junctionStart,
            toName: set.junctionEnd,
            line: pts,
            dashed: false,
            interSet: false,
          });
        }
      });

      // 航路が異なる場合のみ点線で2点を結ぶ
      for (let i = 0; i < this.airwayPathSets.length - 1; i++) {
        const cur = this.airwayPathSets[i];
        const nxt = this.airwayPathSets[i + 1];
        if (!cur || !nxt) continue;
        if (!cur.airwayId || !nxt.airwayId || cur.airwayId === '---' || nxt.airwayId === '---') continue;

        const hasCurEnd = cur.junctionEnd && cur.junctionEnd !== '---';
        const hasNextStart = nxt.junctionStart && nxt.junctionStart !== '---';
        if (!hasCurEnd || !hasNextStart) continue;

        if (cur.airwayId !== nxt.airwayId) {
          const pEnd  = this.computeSectionCenter(cur.airwayId, cur.junctionEnd);
          const pNext = this.computeSectionCenter(nxt.airwayId, nxt.junctionStart);

          // 座標が同一点（近傍）なら内視界飛行ではない → 点線を作らない
          if (this.isSamePointByMeters(pEnd, pNext, 1)) {
            continue;
          }

          // 2点が取れた時だけ追加（保険）
          if (Array.isArray(pEnd) && pEnd.length === 2 && Array.isArray(pNext) && pNext.length === 2) {
            segs.push({
              airwayId: null,
              fromName: cur.junctionEnd,
              toName: nxt.junctionStart,
              line: [pEnd, pNext],
              dashed: true,
              interSet: true,
            });
          }
        }
      }

      return segs;
    },

    makerOptions() {
      return [...new Set(this.allowedAircraftList.map(a => a.maker).filter(Boolean))];
    },

    modelNumberOptions() {
      if (this.selectedMaker === '---') return [];
      const list = this.allowedAircraftList
        .filter(a => a.maker === this.selectedMaker)
        .map(a => a.modelNumber)
        .filter(Boolean);
      return [...new Set(list)];
    },

    aircraftNameOptions() {
      // 持ち込みONは機体名プルダウン非表示なので空
      if (this.isAircraftBringIn) return [];
      if (this.selectedMaker === '---' || this.selectedModelNumber === '---') return [];
      const list = this.mappedAircraftInfoList.map(x => x.aircraftName).filter(Boolean);
      return [...new Set(list)];
    },

    airwayPathRenderItems() {
      const items = [];
      const sets = Array.isArray(this.airwayPathSets) ? this.airwayPathSets : [];

      for (let i = 0; i < sets.length; i++) {
        items.push({ type: 'set', key: `set-${i}`, idx: i, set: sets[i] });

        if (i < sets.length - 1) {
          const cur = sets[i];
          const nxt = sets[i + 1];

          const hasCurEnd = cur?.junctionEnd && cur.junctionEnd !== '---';
          const hasNextStart = nxt?.junctionStart && nxt.junctionStart !== '---';
          const hasBothAirway = cur?.airwayId && nxt?.airwayId && cur.airwayId !== '---' && nxt.airwayId !== '---';

          let isNaiShikai = false;

          if (hasBothAirway && hasCurEnd && hasNextStart && cur.airwayId !== nxt.airwayId) {
            const pEnd  = this.computeSectionCenter(cur.airwayId, cur.junctionEnd);
            const pNext = this.computeSectionCenter(nxt.airwayId, nxt.junctionStart);

            // ★同一点なら内視界飛行ではない
            if (!this.isSamePointByMeters(pEnd, pNext, 1)) {
              isNaiShikai = true;
            }
          }

          if (isNaiShikai) items.push({ type: 'separator', key: `sep-${i}` });
        }
      }
      return items;
    },

    // 航路(droneList)で許可された aircraftInfoId に合致する /aircraft だけ
    allowedAircraftList() {
      const aircraft = this.droneItems?.aircraft || []; // /aircraft
      const allowed = Array.isArray(this.allowedAircraftInfoIds) ? this.allowedAircraftInfoIds : [];
      if (!allowed.length) return [];
      return aircraft.filter(a => allowed.includes(a.aircraftInfoId));
    },
    // 選択中 maker + modelNumber で /aircraft の1件を特定（aircraftInfoId/type/length/name 取得用）
    selectedAircraftMaster() {
      if (this.selectedMaker === '---' || this.selectedModelNumber === '---') return null;
      return (
        this.allowedAircraftList.find(a =>
          a.maker === this.selectedMaker && a.modelNumber === this.selectedModelNumber
        ) || null
      );
    },
    // maker(manufacturer) + modelNumber で aircraft/info/list を絞る
    mappedAircraftInfoList() {
      const infoList = Array.isArray(this.aircraftData?.data) ? this.aircraftData.data : [];
      const a = this.selectedAircraftMaster;
      if (!a) return [];
      return infoList.filter(info =>
        info.manufacturer === a.maker && info.modelNumber === a.modelNumber
      );
    },
    // セットごとの航路選択肢（computedでキャッシュ）
    allRouteOptions() {
      if (this.selectedAreaName === '---') {
        return this.airwayPathSets.map(() => []);
      }
      const base = Array.isArray(this.routes) ? this.routes : [];
      const cachedAirways = this.airwayData?.airway?.airways || [];
      // 自社航路の判定：GET /uasl-list 由来の ownAirwayData に存在する airwayId を自社とみなす
      const ownAirwayIdSet = new Set(
        (this.ownAirwayData?.airway?.airways || []).map(a => a.airwayId)
      );
      const isOwnAirway = (airwayId) => ownAirwayIdSet.has(airwayId);
      return this.airwayPathSets.map((set, idx) => {
        if (!set || set.purpose === '---') return [];

        // 1番目の航路は自社航路のみ表示
        const isFirst = idx === 0;
        const filtered = base.filter(r =>
          r.purpose === set.purpose &&
          (!isFirst || isOwnAirway(r.airwayId))
        );
        const baseById = new Map(filtered.map(r => [r.airwayId, r]));

        const selectedId = set.airwayId;
        if (selectedId && selectedId !== '---' && !baseById.has(selectedId)) {
          const aw = cachedAirways.find(a => a.airwayId === selectedId);
          if (aw && (aw.flightPurpose || '目的未設定') === set.purpose) {
            // 1番目の航路は自社航路のみキャッシュにも追加
            if (!isFirst || isOwnAirway(selectedId)) {
              baseById.set(selectedId, {
                id: `selected-${selectedId}`,
                airwayId: selectedId,
                airwayName: `${aw.airwayName || '名称未設定'}（選択中）`,
                purpose: aw.flightPurpose || '目的未設定',
                businessNumber: aw.businessNumber,
              });
            }
          }
        }

        return [...baseById.values()];
      });
    },
  },
  methods: {
    changeModel() {
      this.airway.type = this.selectedModel;
      this.airway.aircraftInfo = this.getAircraftInfo(this.selectedModel);
      this.airway.aircraftInfoId = this.getAircraftInfoId(this.selectedModel);
      this.updateBasicInfomation();
    },
    updateBasicInfomation() {
      // pathSets（画面のセット構造をそのまま保持）
      this.airway.pathSets = JSON.parse(JSON.stringify(this.airwayPathSets));

      // ★追加：目的を配列で格納（「設定された」ものだけ）
      this.airway.purpose = this.airwayPathSets
        .map(s => s?.purpose)
        .filter(p => p && p !== '---');

      // 航路ID（重複排除済み）
      const ids = this.selectedAirwayIds;
      this.airway.airwayId = ids;

      // 航路名（重複排除）
      const names = this.airwayPathSets
        .map(s => s.airwayName)
        .filter(n => n && n !== '---');
      this.airway.airwayName = [...new Set(names)];

      this.airway.departureAirwayId = this.selectedDepartureAirwayId;
      this.airway.arrivalAirwayId = this.selectedArrivalAirwayId;
      this.airway.departureAirwayName = this.selectedDepartureAirwayName;
      this.airway.arrivalAirwayName = this.selectedArrivalAirwayName;

      // 航路点一覧（カンマ結合）
      const juncs = [];
      this.airwayPathSets.forEach(s => {
        if (s.junctionStart && s.junctionStart !== '---') juncs.push(s.junctionStart);
        if (s.junctionEnd && s.junctionEnd !== '---') juncs.push(s.junctionEnd);
      });

      // section（computedの section を利用）
      this.airway.section = this.sectionNames;

      this.airway.sectionNames = this.sectionNames;
      this.airway.sectionIds   = this.sectionIds;

      // junctionList は従来互換で「名前」にする（※ここ重要：今はIDが入るので変換）
      const juncNames = [];
      const juncIds = [];
      this.airwayPathSets.forEach(s => {
        if (s.junctionStart && s.junctionStart !== '---') {
          juncIds.push(s.junctionStart);
          juncNames.push(this.junctionNameById(s.airwayId, s.junctionStart));
        }
        if (s.junctionEnd && s.junctionEnd !== '---') {
          juncIds.push(s.junctionEnd);
          juncNames.push(this.junctionNameById(s.airwayId, s.junctionEnd));
        }
      });
      this.airway.junctionList = juncNames.filter(Boolean).join(','); // 互換（名前）
      this.airway.junctionIdList = juncIds.join(',');                 // 追加（ID）

      //  離着陸場 UI上の選択は保持しつつ、登録値としては isPortNeeded=false なら空扱いにする
      const depPortForRegister = this.isPortNeeded ? this.selectedDeparturePort : '---';
      const arrPortForRegister = this.isPortNeeded ? this.selectedArrivalPort : '---';

      this.airway.departurePort = depPortForRegister;
      this.airway.arrivalPort = arrPortForRegister;

      this.airway.departurePortDegrees = this.isPortNeeded ? this.departurePortDegrees : [];
      this.airway.arrivalPortDegrees = this.isPortNeeded ? this.arrivalPortDegrees : [];

      // PortId も「不要なら空」にする
      if (this.isPortNeeded && this.portData?.data) {
        const dep = this.portData.data.find(p => p.dronePortName === depPortForRegister);
        this.airway.departurePortId = dep ? dep.dronePortId : '';
        const arr = this.portData.data.find(p => p.dronePortName === arrPortForRegister);
        this.airway.arrivalPortId = arr ? arr.dronePortId : '';
      } else {
        this.airway.departurePortId = '';
        this.airway.arrivalPortId = '';
      }

      // フラグ（親に渡して次画面でも判断できるように）
      this.airway.isPortNeeded = this.isPortNeeded;

      // 並び順フラグ
      this.airway.isEndIdFirst = this.isEndIdFirst;

      // 登録機体：onChangeAircraftName()で aircraftId / aircraftRemoteId をセット済み
      // 持ち込み：vehicleId は空、リモートIDは任意入力（空OK）
      if (this.isAircraftBringIn) {
        this.airway.aircraftId = '';
        this.airway.aircraftRemoteId = (this.inputedAircraftId || '').trim(); // 任意（空OK）
      } else {
        // 登録機体：ここでは上書きしない（機体名選択時の確定値を保持）
        this.airway.aircraftRemoteId = this.airway.aircraftRemoteId ?? '';
      }

      // 必要ならフラグも保持
      this.airway.isAircraftBringIn = this.isAircraftBringIn;

      // maker/model から作る aircraftInfo（現行踏襲）
      this.setAircraftInfoFromMakerModel();

      // 親へ通知
      this.$emit('update:airway', this.airway);
    },
    sortPortName(airwayId, junctionId) {
      const airway = this.airwayData?.airway?.airways?.find(a => a.airwayId === airwayId);
      const junction = airway?.airwayJunctions?.find(j => String(j.airwayJunctionId) === String(junctionId));
      const c = junction?.airways?.[0]?.airway?.geometry?.coordinates;
      if (!c) return [];

      const sectionCoordinates = [
        (c[0][1] + c[2][1]) / 2,
        (c[0][0] + c[2][0]) / 2
      ];

      const Ports = (this.portData?.data ?? []).map(port => {
        const portDegrees = [port.lat, port.lon];
        const dist = turf.distance(portDegrees, sectionCoordinates) * 1000;
        return {
          dronePortName: port.dronePortName,
          distance: dist
        };
      });

      return Ports
        .sort((a, b) => a.distance - b.distance)
        .map(x => x.dronePortName);
    },
    selectDeparturePort(){
      const fs = this.firstSet;
      if (!fs?.junctionStart || fs.junctionStart === '---') {
        this.showError('先に「航路点」を選択してください。');
        this.selectedDeparturePort = '---';
        return;
      }
      const portDegrees = (this.portData?.data ?? []).find(port => port.dronePortName === this.selectedDeparturePort);
      this.departurePortDegrees = portDegrees ? [portDegrees.lat, portDegrees.lon] : [];
      this.updateBasicInfomation();
      this.clearError();
    },
    selectArrivalPort(){
      const ls = this.lastSet;
      if (!ls?.junctionEnd || ls.junctionEnd === '---') {
        this.showError('先に「航路点」を選択してください。');
        this.selectedArrivalPort = '---';
        return;
      }
      const portDegrees = (this.portData?.data ?? []).find(port => port.dronePortName === this.selectedArrivalPort);
      this.arrivalPortDegrees = portDegrees ? [portDegrees.lat, portDegrees.lon] : [];
      this.updateBasicInfomation();
      this.clearError();
    },
    getUniqueTypes() {
      const types = this.droneItems.aircraft.map(item => item.type);
      this.uniqueTypes = [...new Set(types)];
      this.updateBasicInfomation()
    },
    filterLengths() {
      this.airway.aircraftInfo = "",
      this.airway.aircraftInfoId = "",
      this.selectedLength = '---';
      this.selectedModel = '---';
      this.filterModels();
      this.updateBasicInfomation()
    },
    filterModels() {
      this.airway.aircraftInfo = "",
      this.airway.aircraftInfoId = "",
      this.selectedModel = '---';
      if (this.droneItems && this.droneItems.aircraft) {
        let minLength = 0;
        let maxLength = Infinity;

        if (this.selectedLength === '500mm未満') {
          maxLength = 500;
        } else if (this.selectedLength === '500mm以上950mm未満') {
          minLength = 500;
          maxLength = 950;
        } else if (this.selectedLength === '950mm以上') {
          minLength = 950;
        } else if (this.selectedLength === '---') {
          this.filteredModels = [];
          return;
        }

        let list = this.droneItems.aircraft.filter(item =>
          item.type === this.selectedType &&
          item.length >= minLength &&
          item.length < maxLength
        );

        if (Array.isArray(this.allowedAircraftInfoIds) && this.allowedAircraftInfoIds.length > 0) {
          list = list.filter(item => this.allowedAircraftInfoIds.includes(item.aircraftInfoId));
        }

        this.filteredModels = list.map(item => item.name);
      } else {
        console.error('droneItems.aircraft is undefined');
      }
      this.updateBasicInfomation()
    },
    getAircraftInfoId(selectedModel) {
      const droneData = this.droneData.aircraft;
      const result = droneData.find(aircraft => aircraft.name === selectedModel);
      if (result) {
        return result.aircraftInfoId;
      } else {
        return null;
      }
    },
    getAircraftInfo(selectedModel) {
      const droneData = this.droneData.aircraft;
      const result = droneData.find(aircraft => aircraft.name === selectedModel);
      if (result) {
        const { maker, model_number: modelNumber, name, type, length } = result;
        return { maker, modelNumber, name, type, length };
      } else {
        return null;
      }
    },
    handleIsEndIdFirst(value) {
      this.isEndIdFirst = value;
      this.updateBasicInfomation();
    },
    setPortNeeded(flag) {
      if (this.isPortNeeded === flag) return;
      this.isPortNeeded = flag;

      this.clearError();
      this.updateBasicInfomation();
    },
    onChangeAircraftBringIn() {
      if (this.isAircraftBringIn) {
        // 持ち込みON：
        // - 登録機体の概念である「機体名」と、登録機体由来のIDはクリア
        this.selectedAircraftName = '---';

        this.airway.aircraftId = '';
        this.airway.aircraftRemoteId = '';
        this.airway.aircraftInfoId = '';
        this.airway.aircraftInfo = '';

      } else {
        // 持ち込みOFF（登録機体へ戻る）
        // 機体名を再選択させる（aircraftId等は機体名選択で確定するため）
        this.selectedAircraftName = '---';
        this.airway.aircraftId = '';
        this.airway.aircraftRemoteId = '';
        this.airway.aircraftInfoId = '';
        this.airway.aircraftInfo = '';
      }

      this.updateBasicInfomation();
    },

    setAircraftNeeded(flag) {
      if (this.isAircraftNeeded === flag) return;
      this.isAircraftNeeded = flag;

      if (!flag) {
        this.isAircraftBringIn = false;
        this.inputedAircraftId = '';

        this.selectedMaker = '---';
        this.selectedModelNumber = '---';
        this.selectedAircraftName = '---';

        this.airway.aircraftId = '';
        this.airway.aircraftInfo = '';
        this.airway.aircraftInfoId = '';
      }

      this.updateBasicInfomation();
    },
    showError(msg) {
      this.errorMessage = msg;
    },
    clearError() {
      this.errorMessage = '';
    },
    syncTypeAndModelByRoute() {
      const currentInfoId = this.getAircraftInfoId(this.selectedModel);
      if (
        currentInfoId !== null &&
        Array.isArray(this.allowedAircraftInfoIds) &&
        !this.allowedAircraftInfoIds.includes(currentInfoId)
      ) {
        this.selectedModel = '---';
        this.airway.aircraftInfo = '';
        this.airway.aircraftInfoId = '';
      }
      this.filterModels();
    },
    computeSectionCenter(airwayId, junctionId) {
      if (!airwayId || airwayId === '---' || !junctionId || junctionId === '---') return null;
      const airway = this.airwayData?.airway?.airways?.find(a => a.airwayId === airwayId);
      const junction = airway?.airwayJunctions?.find(j => String(j.airwayJunctionId) === String(junctionId));
      const c = junction?.airways?.[0]?.airway?.geometry?.coordinates;
      if (!c) return null;
      const lat = (c[0][1] + c[2][1]) / 2;
      const lon = (c[0][0] + c[2][0]) / 2;
      return [lat, lon];
    },
    addPathSet() {
      this.suppressFitBounds = true;
      this.airwayPathSets.push({
        purpose: '---',
        airwayId: '---',
        airwayName: '---',
        junctionStart: '---',
        junctionEnd: '---',
        junctionNames: []
      });
      this.syncLegacyFieldsFromSets();
      this.updateBasicInfomation();
    },
    removePathSet(idx) {
      if (this.airwayPathSets.length === 1) return;
      this.suppressFitBounds = true;
      this.airwayPathSets.splice(idx, 1);
      this.recomputePortsAndMarkers();
      this.syncLegacyFieldsFromSets();
      this.updateBasicInfomation();
      this.filterModels();
    },
    onSelectAirway(idx) {
      this.suppressFitBounds = false;

      const set = this.airwayPathSets[idx];

      if (!set || set.purpose === '---') {
        this.showError('先に「飛行目的」を選択してください。');
        this.airwayPathSets[idx].airwayId = '---';
        return;
      }

      set.junctionStart = '---';
      set.junctionEnd = '---';
      set.junctionNames = this.getJunctionNames(set.airwayId);
      set.airwayName = this.getAirwayName(set.airwayId);

      this.recomputePortsAndMarkers();
      this.syncLegacyFieldsFromSets();
      this.updateBasicInfomation();
      this.clearError();
      this.filterModels();
    },
    onSelectStart(idx) {
      this.suppressFitBounds = false;
      const set = this.airwayPathSets[idx];
      if (set.airwayId === '---') {
        this.showError('先に「航路」を選択してください。');
        set.junctionStart = '---';
        return;
      }

      if (idx === 0) {
        this.sortedDeparturePorts = this.sortPortName(set.airwayId, set.junctionStart);

        // 最寄りを自動選択
        this.autoSelectNearestDeparturePort();

        const p = this.computeSectionCenter(set.airwayId, set.junctionStart);
        this.departureSectionDegrees = p ?? [];
      }

      this.syncLegacyFieldsFromSets();
      this.updateBasicInfomation();
      this.clearError();
    },
    onSelectEnd(idx) {
      this.suppressFitBounds = false;
      const set = this.airwayPathSets[idx];
      if (set.airwayId === '---') {
        this.showError('先に「航路」を選択してください。');
        set.junctionEnd = '---';
        return;
      }

      if (idx === this.airwayPathSets.length - 1) {
        this.sortedArrivalPorts = this.sortPortName(set.airwayId, set.junctionEnd);

        // 最寄りを自動選択
        this.autoSelectNearestArrivalPort();

        const p = this.computeSectionCenter(set.airwayId, set.junctionEnd);
        this.arrivalSectionDegrees = p ?? [];
      }

      this.syncLegacyFieldsFromSets();
      this.updateBasicInfomation();
      this.clearError();
    },
    getJunctionNames(airwayId) {
      const airway = this.airwayData?.airway?.airways?.find(a => a.airwayId === airwayId);
      if (!airway) return [];
      return (airway.airwayJunctions || []).map(j => ({
        id: String(j.airwayJunctionId),
        name: j.airwayJunctionName,
      }));
    },
    junctionNameById(airwayId, junctionId) {
      if (!airwayId || airwayId === '---' || !junctionId || junctionId === '---') return null;
      const airway = this.airwayData?.airway?.airways?.find(a => a.airwayId === airwayId);
      const j = airway?.airwayJunctions?.find(x => String(x.airwayJunctionId) === String(junctionId));
      return j?.airwayJunctionName ?? null;
    },
    getAirwayName(airwayId) {
      const airway = this.airwayData?.airway?.airways?.find(a => a.airwayId === airwayId);
      return airway ? airway.airwayName : '---';
    },
    recomputePortsAndMarkers() {
      const fs = this.firstSet;
      if (fs?.airwayId && fs.junctionStart && fs.junctionStart !== '---') {
        this.sortedDeparturePorts = this.sortPortName(fs.airwayId, fs.junctionStart);
        this.departureSectionDegrees = this.computeSectionCenter(fs.airwayId, fs.junctionStart) ?? [];
      } else {
        this.sortedDeparturePorts = [];
        this.departureSectionDegrees = [];
      }

      const ls = this.lastSet;
      if (ls?.airwayId && ls.junctionEnd && ls.junctionEnd !== '---') {
        this.sortedArrivalPorts = this.sortPortName(ls.airwayId, ls.junctionEnd);
        this.arrivalSectionDegrees = this.computeSectionCenter(ls.airwayId, ls.junctionEnd) ?? [];
      } else {
        this.sortedArrivalPorts = [];
        this.arrivalSectionDegrees = [];
      }
    },
    syncLegacyFieldsFromSets() {
      const fs = this.firstSet || {};
      const ls = this.lastSet || {};

      this.selectedDepartureAirwayId = fs.airwayId || '---';
      this.selectedDepartureAirwayName = fs.airwayName || '---';
      this.selectedDepartureSection = this.junctionNameById(fs.airwayId, fs.junctionStart) || '---';

      this.selectedArrivalAirwayId = ls.airwayId || '---';
      this.selectedArrivalAirwayName = ls.airwayName || '---';
      this.selectedArrivalSection = this.junctionNameById(ls.airwayId, ls.junctionEnd) || '---';
    },

    // 同一航路内で junctionName の並び順（index）を取得（描画順の基準）
    getJunctionIndexById(airwayId, junctionId) {
      const aw = this.airwayData?.airway?.airways?.find(a => a.airwayId === airwayId);
      if (!aw || !Array.isArray(aw.airwayJunctions)) return -1;
      return aw.airwayJunctions.findIndex(j => String(j.airwayJunctionId) === String(junctionId));
    },

    // 開始→終了の間にある中間点を含めて、航路上の折れ線座標配列を返す
    computePointsAlongAirway(airwayId, startId, endId) {
      const aw = this.airwayData?.airway?.airways?.find(a => a.airwayId === airwayId);
      if (!aw || !Array.isArray(aw.airwayJunctions)) return [];

      const iStart = this.getJunctionIndexById(airwayId, startId);
      const iEnd   = this.getJunctionIndexById(airwayId, endId);
      if (iStart === -1 || iEnd === -1 || iStart === iEnd) return [];

      const i0 = Math.min(iStart, iEnd);
      const i1 = Math.max(iStart, iEnd);

      let idsInPath = aw.airwayJunctions.slice(i0, i1 + 1).map(j => String(j.airwayJunctionId));
      if (iStart > iEnd) idsInPath = idsInPath.reverse();

      return idsInPath
        .map(id => this.computeSectionCenter(airwayId, id))
        .filter(p => Array.isArray(p) && p.length === 2);
    },

    // 開始点の候補（終了点で選択中のものは除外）
    junctionNamesForStart(idx) {
      const set = this.airwayPathSets[idx];
      if (!set) return [];
      const endId = set.junctionEnd;
      return (set.junctionNames ?? []).filter(o => !(endId && endId !== '---' && o.id === endId));
    },

    // 終了点の候補（開始点で選択中のものは除外）
    junctionNamesForEnd(idx) {
      const set = this.airwayPathSets[idx];
      if (!set) return [];
      const startId = set.junctionStart;
      return (set.junctionNames ?? []).filter(o => !(startId && startId !== '---' && o.id === startId));
    },

    resetAircraftSelectionFrom(level) {
      // level: 'maker' | 'model' | 'name'
      if (level === 'maker') {
        this.selectedModelNumber = '---';
        this.selectedAircraftName = '---';
      } else if (level === 'model') {
        this.selectedAircraftName = '---';
      } else if (level === 'name') {
      }

      // 選択が未確定になったら airway 側もクリア
      this.airway.aircraftId = '';
      this.airway.aircraftInfoId = '';
      this.airway.aircraftInfo = '';
    },

    onChangeMaker() {
      this.resetAircraftSelectionFrom('maker');
      this.setAircraftInfoFromMakerModel();
      this.updateBasicInfomation();
    },
    onChangeModelNumber() {
      this.resetAircraftSelectionFrom('model');
      this.setAircraftInfoFromMakerModel();
      this.updateBasicInfomation();
    },

    onChangeAircraftName() {
      // 機体名が未選択ならクリア
      if (this.selectedAircraftName === '---') {
        this.airway.aircraftId = '';
        this.airway.aircraftRemoteId = '';
        this.airway.aircraftInfoId = '';
        this.airway.aircraftInfo = '';
        this.updateBasicInfomation();
        return;
      }
    
      const a = this.selectedAircraftMaster;
      const hit = this.mappedAircraftInfoList.find(x => x.aircraftName === this.selectedAircraftName);

    
      if (!a || !hit) {
        this.airway.aircraftId = '';
        this.airway.aircraftRemoteId = '';
        this.airway.aircraftInfoId = '';
        this.airway.aircraftInfo = '';
        this.updateBasicInfomation();
        return;
      }
    
      // vehicleId（API指定用）
      this.airway.aircraftId = hit.aircraftId;
      // 画面表示用：機体リモートID（dipsRegistrationCode。無ければ空）
      this.airway.aircraftRemoteId = hit.dipsRegistrationCode ?? '';
    
      this.airway.aircraftInfoId = a.aircraftInfoId;
      this.airway.aircraftInfo = this.buildAircraftInfoObject({
        aircraftInfoId: a.aircraftInfoId,
        registrationId: hit.dipsRegistrationCode || '',
        maker: a.maker,
        modelNumber: a.modelNumber,
        name: a.name ?? '',
        type: a.type,
        length: a.length,
      });
    
      this.updateBasicInfomation();
    },

    handleAirwaysUpdated(convertedVisible) {
      const incoming = convertedVisible?.airway?.airways || [];

      const current = this.airwayData?.airway?.airways || [];
      const mapById = new Map(current.map(a => [a.airwayId, a]));
      incoming.forEach(a => mapById.set(a.airwayId, a));
      this.airwayData = { airway: { airways: [...mapById.values()] } };
      // 選択航路データを共有キャッシュへ同期（datetimeSetting でカレンダー描画に使用）
      this.selectedAirwayData = { ...this.airwayData };

      // junctionNameMap を更新（uaslPointId → uaslPointName, externalSystemInfo 補完済みの名前を含む）
      const addedNames = {};
      for (const airway of (this.airwayData?.airway?.airways || [])) {
        for (const j of (airway.airwayJunctions || [])) {
          if (j.airwayJunctionId && j.airwayJunctionName) {
            addedNames[j.airwayJunctionId] = j.airwayJunctionName;
          }
        }
      }
      this.junctionNameMap = { ...this.junctionNameMap, ...addedNames };

      const visibleRoutes = incoming.map((item, index) => ({
        id: index,
        airwayId: item.airwayId,
        airwayName: item.airwayName || '名称未設定',
        purpose: item.flightPurpose || '目的未設定',
        businessNumber: item.businessNumber,
      }));

      this.routes = visibleRoutes;
    },
    // 自社航路（GET /uasl-list 由来）のみを蓄積するハンドラ
    handleOwnAirwaysUpdated(ownConverted) {
      const incoming = ownConverted?.airway?.airways || [];
      const current = this.ownAirwayData?.airway?.airways || [];
      const mapById = new Map(current.map(a => [a.airwayId, a]));
      incoming.forEach(a => mapById.set(a.airwayId, a));
      this.ownAirwayData = { airway: { airways: [...mapById.values()] } };
    },
    handlePortsUpdated(portData) {
      this.portData = portData;
      this.recomputePortsAndMarkers();

      // portId → { portName, lat, lon } のハッシュマップを構築してグローバル状態に保存。
      // datetimeSetting / CalendarDisplayOrchestration でセマンティックを再コールせず
      // ポート名を解決できるようにする。
      const map = {};
      (portData?.data ?? []).forEach(p => {
        if (p.dronePortId) {
          map[p.dronePortId] = { portName: p.dronePortName ?? '', lat: p.lat, lon: p.lon };
        }
      });
      this.portHashMap = map;
    },
    setAircraftInfoFromMakerModel() {
      if (this.selectedMaker === '---' || this.selectedModelNumber === '---') {
        this.airway.aircraftInfoId = '';
        this.airway.aircraftInfo = '';
        return;
      }

      const a = this.selectedAircraftMaster; // /aircraft の1件

      if (!a) {
        this.airway.aircraftInfoId = '';
        this.airway.aircraftInfo = '';
        return;
      }

      const infoHit = this.mappedAircraftInfoList.find(x => x.aircraftName === this.selectedAircraftName);

      const registrationId = this.isAircraftBringIn
        ? (this.inputedAircraftId || '')
        : (infoHit?.dipsRegistrationCode || '');

      this.airway.aircraftInfoId = a.aircraftInfoId;
      this.airway.aircraftInfo = this.buildAircraftInfoObject({
        aircraftInfoId: a.aircraftInfoId,
        registrationId,
        maker: a.maker,
        modelNumber: a.modelNumber,
        name: a.name ?? '',
        type: a.type,
        length: a.length,
      });
    },

    buildAircraftInfoObject({ aircraftInfoId, registrationId, maker, modelNumber, name, type, length }) {
      return {
        aircraftInfoId: Number(aircraftInfoId ?? 0),
        registrationId: (registrationId ?? '').trim(),
        maker: maker ?? '',
        modelNumber: modelNumber ?? '',
        name: name ?? '',
        type: type ?? '',
        length: length,
      };
    },

    autoSelectNearestDeparturePort() {
      if (!this.portData?.data?.length) return;
      const cand = this.sortedDeparturePorts?.[0];
      if (!cand) {
        this.selectedDeparturePort = '---';
        this.departurePortDegrees = [];
        return;
      }
      this.selectedDeparturePort = cand;

      const port = this.portData.data.find(p => p.dronePortName === cand);
      this.departurePortDegrees = port ? [port.lat, port.lon] : [];
    },

    autoSelectNearestArrivalPort() {
      if (!this.portData?.data?.length) return;
      const cand = this.sortedArrivalPorts?.[0];
      if (!cand) {
        this.selectedArrivalPort = '---';
        this.arrivalPortDegrees = [];
        return;
      }
      this.selectedArrivalPort = cand;

      const port = this.portData.data.find(p => p.dronePortName === cand);
      this.arrivalPortDegrees = port ? [port.lat, port.lon] : [];
    },

    isSamePointByMeters(p1, p2, thresholdMeters = 1) {
      if (!Array.isArray(p1) || !Array.isArray(p2)) return false;
      if (p1.length !== 2 || p2.length !== 2) return false;

      // turf は [lon, lat] 順
      const dKm = turf.distance([p1[1], p1[0]], [p2[1], p2[0]]);
      return (dKm * 1000) < thresholdMeters;
    },

    onSelectPurpose(idx) {
      const set = this.airwayPathSets[idx];
      if (!set) return;

      // そのセットの航路/航路点をリセット
      set.airwayId = '---';
      set.airwayName = '---';
      set.junctionStart = '---';
      set.junctionEnd = '---';
      set.junctionNames = [];

      // 先頭/末尾に影響する場合はPortもリセット
      if (idx === 0) {
        this.selectedDeparturePort = '---';
        this.departurePortDegrees = [];
        this.departureSectionDegrees = [];
        this.sortedDeparturePorts = [];
      }
      if (idx === this.airwayPathSets.length - 1) {
        this.selectedArrivalPort = '---';
        this.arrivalPortDegrees = [];
        this.arrivalSectionDegrees = [];
        this.sortedArrivalPorts = [];
      }

      this.clearError();
      this.updateBasicInfomation();
      this.filterModels();
    },
  },
  created() {
    this.filteredRoutes = [];
  },
  async mounted() {
    try {
      const res = await $fetch('/api/getAreaJsonData');
      this.areaItems = res.data;
    } catch (e) {
      console.error('JSONの読み込みに失敗しました(getAreaJsonData):', e);
      this.areaItems = { areas: [] };
    }
    
    const droneRes = await $fetch('/api/airway/aircraft', { 
      method: 'GET'
    });
    if (droneRes.status !== 200) {
      console.error(`error: get drone info {status: ${droneRes.status}}.`);
      this.rangeData = null;
      return;
    }
    this.droneData = droneRes.data;
    this.droneItems = droneRes.data;
    this.getUniqueTypes();

    try {
      const apiResult = await $fetch('/api/drone/aircraft/info/list', { 
        method: 'GET',
        query: { publicFlag: 'true' },
      });
      if (apiResult.status !== 200) {
        console.error(`error: get aircraft info {status: ${apiResult.status}}.`);
        this.aircraftData = {};
        return;
      }

      this.aircraftData = apiResult.data;
    } catch (e) {
      console.error('error: get aircraft info failed:', e);
      this.aircraftData = {};
    }

  },
  watch: {
    selectedDepartureAirwayId() {
      this.filterModels();
    },
    selectedArrivalAirwayId() {
      this.filterModels();
    },
    allowedAircraftInfoIds() {
      // 持ち込み時は航路の許可機体リストで縛らない（フリー入力のため）
      // ※ただし今回「maker/model候補は縛る」ので、maker/modelの候補自体はcomputedで絞られている
      if (this.isAircraftBringIn) return;

      if (!Array.isArray(this.droneItems?.aircraft)) return;

      // 機体名が未選択なら何もしない
      if (this.selectedAircraftName === '---') return;

      // 現在選択している maker/model/name が、絞り込み後の候補に存在するか
      const ok =
        !!this.selectedAircraftMaster &&
        this.mappedAircraftInfoList.some(x => x.aircraftName === this.selectedAircraftName);

      if (!ok) {
        // 無効になったのでクリア
        this.selectedMaker = '---';
        this.selectedModelNumber = '---';
        this.selectedAircraftName = '---';

        this.airway.aircraftId = '';
        this.airway.aircraftRemoteId = '';
        this.airway.aircraftInfoId = '';
        this.airway.aircraftInfo = '';

        this.updateBasicInfomation();
      }
    },
    selectableTypes(newList) {
      if (!newList.includes(this.selectedType)) {
        this.selectedType = '---';
        this.selectedLength = '---';
        this.selectedModel = '---';
        this.filteredModels = [];
        this.updateBasicInfomation();
      }
    },
    airwayPathSets: {
      deep: true,
      handler() {
        this.recomputePortsAndMarkers();
        this.syncLegacyFieldsFromSets();
      }
    },
  },
};
</script>

<style>
/* b-table のデフォルト margin-bottom を無効化して地図エリアを最大化 */
#content.b-singleColumnHasTab .b-table {
  margin-bottom: 0;
}

/* 航路選択ヘッダーのインデントを b-table の padding に合わせる */
.drn_form__header {
  padding-left: var(--margin-unit2);
}

.field-size {
  height: 40px !important;
  width: 100%;
}

.v-field__input {
  min-height: 40px;
  height: 40px;
}

.c-formItem-spacer {
  width: 30px;
}

.selected {
  background-color: black;
  color: white;
}

#map {
  height: 100% !important;
}

.map-title-airway {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-16) / var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

/* モーダルウィンドウのスタイル */
.popup {
  position: absolute;
  top: 180px;
  left: 20px;
  width: 1180px;
  height: 231px;
  background-color: #fefefe;
  border: 1px solid #888;
  padding-top: 21px;
  padding-left: 55px;
  padding-right: 55px;
  z-index: 10000;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
}

.horizontal-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.horizontal-list li {
  display: inline-block;
  margin-right: 10px;
}

.option-search {
  display: flex;
}

.option-container {
  display: flex;
}

.option-item {
  margin: 5px;
}

.item-center {
  display: flex;
  justify-content: center;
}

.e-textField-date-option {
  width: 139px;
  height: 25px !important;
  border: 1px solid var(--line_-999999);
}

.e-textField-select {
  width: 250px;
  height: 25px !important;
  border: 1px solid var(--line_-999999);
  padding-top: 5px;
  padding-bottom: 6px;
  padding-left: 10px;
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

.e-button-search {
  width: 98px;
  height: 25px;
  background: var(--txt_-333333) 0% 0% no-repeat padding-box;
  border: 1px solid var(--line_-999999);
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--unnamed-color-ffffff);
  text-align: center;
  margin-top: 15px;
  margin-bottom: 10px;
}

.check-porpose {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
  padding-right: 10px;
}

.v-label.v-label--clickable.font-weight-black {
  font-size: 14px !important;
}

.e-fieldLabel-option {
  margin-bottom: 0.5rem;
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-bold) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

input[type="checkbox"] {
  accent-color: var(--unnamed-color-ffffff) 0% 0% no-repeat padding-box;
  border: 1px solid var(--line_-999999);
  width: 16px;
  height: 16px;
  border-radius: 0;
}

input[type="checkbox"]:checked::before {
  accent-color: var(--unnamed-color-ffffff) 0% 0% no-repeat padding-box;
  color: 2px solid var(--txt_-333333);
}

.c-tableControl-setting {
  display: grid;
  grid-template-columns: 40% 60%;
  column-gap: var(--margin-unit);
  padding: 0 var(--margin-unit2);
  align-content: start;
  align-items: stretch;
}

.container {
  padding: 1px;
}

.table-container {
  width: 100%;
  height: 473px;
}

.button-group {
  margin-bottom: 0.5rem;
  display: flex;
}

.list-group {
  margin-left: auto;
}

.button {
  border-bottom: 1px solid #000000;
  border-right: 1px solid #000000;
  background-color: #FFFFFF;
  color: #000000;
  cursor: pointer;
  padding: 0.5rem 1rem;
}

.button-filter {
  border: 1px solid #000000;
  background-color: #FFFFFF;
  color: #000000;
  cursor: pointer;
  padding-left: 3rem;
  padding-right: 3rem;
}

.button-list {
  border: 1px solid #000000;
  background-color: #FFFFFF;
  color: #000000;
  cursor: pointer;
  padding-left: 3rem;
  padding-right: 3rem;
  right: 0;
}

h1 {
  display: inline;
  padding-right: 1rem;
  font-size: 1.3rem;
}

.header {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

tr.even-row td,
tr.odd-row td {
  border-top: 1px solid;
  padding: 0.5rem;
  text-align: left;
  vertical-align: middle;
}

.v-table__wrapper table thead tr th {
  position: relative;
  padding: 0.3rem;
  text-align: left;
  background-color: #FFFFFF;
  border-bottom: 1px solid;
  line-height: 1.5;
  color: #000;
  vertical-align: middle;
}

.v-table--density-default {
  --v-table-header-height: 35px !important;
  --v-table-row-height: 40px !important;
}

.v-data-table-footer__items-per-page {
  display: none !important;
}

th:not(:first-child) {
  position: relative;
}

.selected {
  background-color: black !important;
  color: white !important;
}

.c-previewTableContainer {
  width: 100%;
  /* b-pageMain(top:35px) + v-stepper-header(~72px) + drn_form__header(~40px)
     + b-pageNavigation(4rem=64px) + subTitle+margin(~24px) + misc(~17px) = ~252px */
  height: calc(100svh - 252px);
  display: grid;
  grid-template-columns: 40% 60%;
  grid-template-rows: 100%;
  column-gap: var(--margin-unit);
  overflow: hidden;
}

#dummyImageRoute {
  display: block;
  width: 100%;
  height: 100%;
  background-image: url("~/assets/css/img/dummyImg/reservedFlightRoute.png");
  background-repeat: no-repeat;
  background-size: 100%;
}

.even-row {
  background-color: #f9f9f9;
}

.odd-row {
  background-color: #ffffff;
}

.custom-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.v-data-table-footer__items-per-page {
  display: none !important;
}

td.change-black a {
  color: black;
  text-decoration: none;
}

tr.selected td.change-black a {
  color: white;
}

.v-table.v-table--has-top.v-table--has-bottom.v-theme--light.v-table--density-default.v-data-table.elevation-1 {
  border: 1px solid #999999 !important;
  height: 100%;
}

.field-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  height: 32px;
}

tr.selected,
tr.selected td,
tr.selected td a {
  background-color: black !important;
  color: white !important;
}

.button-group--inline.button-group--toggle {
  display: inline-flex;
}

.button-group--inline.button-group--toggle .button {
  background-color: #B7C2D3 !important;
  color: #fff !important;
  border: none !important;
  padding: 4px 12px !important;
  line-height: 1 !important;
  font-size: 13px !important;
  font-weight: 700 !important;
}

.button-group--inline.button-group--toggle .button.selected {
  background-color: #2F6BFF !important;
  color: #fff !important;
}

.button-group--inline.button-group--toggle .button {
  border-bottom: none !important;
  border-right: none !important;
  background-image: none !important;
}

:root {
  --vertical-offset: 300px; /* ヘッダーやタブ等の合計高さに合わせて調整 */
}

/* 左フォーム列を縦スクロール可能に */
.pull-down-scroll {
  overflow-y: auto;
  height: 100%;
}

@media (max-width: 1280px) {
  .pull-down-scroll {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 16px;

    overflow-y: auto;
    height: 100%;
  }

  .pull-down-scroll > div > .c-formItemContainer {
    flex: 0 0 auto;
    min-width: 520px;
  }

  .pull-down-scroll .field-header .c-formItemContainer {
    flex: 0 0 auto;
    min-width: auto;
  }

  .pull-down-scroll .delete-sp {
    width: 0;
    flex: 0 0 0;
  }
  .pull-down-scroll .delete-col {
    width: 32px;
    flex: 0 0 32px;
  }

  .field-size {
    width: 240px;
  }

  .full-width-select {
    width: 100%;
    margin-right: 0;
  }

  .pull-down-scroll .c-formItemContainer {
    display: flex;
    gap: 0px;
  }
  .pull-down-scroll .c-formItem-spacer {
    width: 0;
  }
  .field-width {
    width: 240px;
  }
}

.c-formItemContainer {
  display: flex;
  align-items: flex-start;
}

.placeLabel {
  font-size: 16px;
  font-weight: bold;
}

#aircraftIdField {
  border: 0!important;
  width: 180px;
}

input:focus {
  outline: none;
}

.full-width-select {
  width: calc(100% + 18px);
  margin-right: -18px;

  display: block;
  max-width: none;          /* max-width:100% で潰されないように */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.error-banner {
  color: red;
}

.delete-col {
  width: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.delete-btn {
  width: 40px;
  height: 40px;
  line-height: 1;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.delete-sp {
  width: 30px;
  flex: 0 0 30px;
}

.arrow-and-endlabel {
  position: relative;
  width: 100%;
  max-width: 240px;
  min-height: 20px;
  margin: 4px 0;
}

.arrow-and-endlabel .endlabel-left {
  display: inline-block;
  text-align: left;
  margin: 0;
  line-height: 20px;
}

.arrow-and-endlabel .arrow-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #000;
  line-height: 1;
}

.route-set-row .c-formItem > .e-fieldLabel {
  display: block;
  min-height: 20px;
  line-height: 20px;
  margin-bottom: 4px;
}

.e-fieldLabel .label-inner { visibility: visible; }
.e-fieldLabel .label-inner.is-hidden { visibility: hidden; }

.field-width {
  width: 100%;
  max-width: 240px;
}

.route-point-arrow-line {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 20px;
  margin: 4px 0;
  color: #000;
}

.route-set-row .e-fieldLabel {
  display: block;
  margin-bottom: 4px;
}

.route-set-row .delete-col {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.route-set-row.is-not-first .delete-col {
  display: flex;
  flex-direction: column;
}

.route-set-row.is-not-first .route-point-arrow-line {
  height: 24px;
  margin: 0;
}

.route-set-row.is-not-first .delete-col .btn-circle {
  /* route-point-spacer(24px) + 飛行目的label(~24px) + 飛行目的select(40px) + div-spacer(8px) の合計から
     delete-col内の arrow-line(24px) を引き、航路キャプションより少し上に来るよう設定 */
  margin-top: 56px;
}

.btn-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-size: 16px;
  font-weight: 700;
  padding: 0;
  line-height: 1;
  cursor: pointer;
  user-select: none;
}

/* 見えないが場所（幅/高さ）は保持する */
.keep-space-hidden {
  visibility: hidden;
  pointer-events: none; /* クリック・ドラッグなども無効化 */
}

/* inputの横幅を枠内に収める（念のため） */
.v-field__input > input[type="text"] {
  width: 100%;
  height: 40px;
  box-sizing: border-box;
  border: 0;          /* v-field の枠を使う前提なら */
  background: transparent;
}

.route-separator {
  margin: 6px 0 10px;
  padding: 6px 0;
  width: 100%;
}

.route-gap {
  height: 8px; /* 左列の「<div style='height:8px;'>」と揃える */
}

/* + ボタン行：航路・航路点カラムの中央に配置 */
.add-path-set-row {
  margin: 8px 0 16px;
}

.add-path-set-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* 離着陸場サブタイトル行 */
.port-subtitle-row {
  margin-bottom: 4px;
}

/* field-header内のc-formItemのmargin-bottomをリセット */
.field-header .c-formItemContainer .c-formItem {
  margin-bottom: 0;
}

/* ドローン機体セクションの上間隆 */
.drone-section-header {
  margin-top: 1.5rem;
}

/* ラベル―セレクトボックス間のマージンを飛行目的/航路と揃える */
.pull-down-scroll .c-formItem > .e-fieldLabel {
  margin-bottom: 4px;
}

/* 地図の角丸 */
.map-container-dd {
  border-radius: 8px;
  overflow: hidden;
}
</style>