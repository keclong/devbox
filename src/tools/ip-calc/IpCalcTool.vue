<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElAlert, ElButton, ElDescriptions, ElDescriptionsItem, ElInput, ElMessage } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder } from '../../composables/useHistory'
import { parseIp, type Ipv4Result, type Ipv6Result } from './ip'

const input = ref('192.168.1.130/24')

const parsed = computed(() => parseIp(input.value))
const v4 = computed<Ipv4Result | null>(() =>
  parsed.value.version === 4 ? (parsed.value.result as Ipv4Result) : null,
)
const v6 = computed<Ipv6Result | null>(() =>
  parsed.value.version === 6 ? (parsed.value.result as Ipv6Result) : null,
)
const error = computed(() => {
  const r = parsed.value.result
  return r.ok ? '' : r.error
})

const EXAMPLES = ['192.168.1.130/24', '10.0.0.0/8', '172.16.5.9', '2001:db8:85a3::8a2e:370:7334/64', 'fe80::1']

// 输入停止变化 1.2 秒后自动记录，避免逐字记录
const recorder = createRecorder('ip')
watch(input, () =>
  recorder.schedule(() =>
    input.value.trim() ? { label: input.value.trim(), data: { input: input.value } } : null,
  ),
)

function restore(data: unknown): void {
  const value = (data as { input?: unknown }).input
  if (typeof value !== 'string') return
  input.value = value
  ElMessage.success('已恢复历史记录')
}
</script>

<template>
  <ToolLayout title="IP 子网计算器" description="IPv4/IPv6 CIDR 解析：网段、掩码、可用主机范围">
    <template #input>
      <span class="field-label">IP 地址或 CIDR</span>
      <ElInput v-model="input" class="fill" placeholder="如 192.168.1.130/24 或 2001:db8::/64" />
      <div class="example-row">
        <span class="field-label">示例</span>
        <ElButton v-for="e in EXAMPLES" :key="e" size="small" @click="input = e">
          {{ e }}
        </ElButton>
      </div>
      <p class="hint">不带前缀时 IPv4 按 /32、IPv6 按 /128 处理；按内容自动识别 v4 / v6</p>
      <HistoryPanel tool-id="ip" @restore="restore" />
    </template>

    <template #output>
      <ElAlert v-if="error" :title="error" type="error" show-icon :closable="false" />
      <ElDescriptions v-else-if="v4" :column="1" border size="small">
        <ElDescriptionsItem label="IP 地址">{{ v4.ip }}</ElDescriptionsItem>
        <ElDescriptionsItem label="前缀长度">/{{ v4.prefix }}</ElDescriptionsItem>
        <ElDescriptionsItem label="网络地址">{{ v4.network }}</ElDescriptionsItem>
        <ElDescriptionsItem label="广播地址">{{ v4.broadcast }}</ElDescriptionsItem>
        <ElDescriptionsItem label="子网掩码">{{ v4.mask }}</ElDescriptionsItem>
        <ElDescriptionsItem label="反掩码">{{ v4.wildcard }}</ElDescriptionsItem>
        <ElDescriptionsItem label="可用主机范围">
          {{ v4.firstHost }} ~ {{ v4.lastHost }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="可用主机数">{{ v4.hostCount.toLocaleString() }}</ElDescriptionsItem>
        <ElDescriptionsItem label="地址总数">{{ v4.totalCount.toLocaleString() }}</ElDescriptionsItem>
        <ElDescriptionsItem label="IP 类别">{{ v4.ipClass }}</ElDescriptionsItem>
        <ElDescriptionsItem label="地址类型">{{ v4.scope }}</ElDescriptionsItem>
        <ElDescriptionsItem label="二进制">{{ v4.binary }}</ElDescriptionsItem>
      </ElDescriptions>
      <ElDescriptions v-else-if="v6" :column="1" border size="small">
        <ElDescriptionsItem label="压缩形式">{{ v6.address }}</ElDescriptionsItem>
        <ElDescriptionsItem label="完整形式">{{ v6.expanded }}</ElDescriptionsItem>
        <ElDescriptionsItem label="前缀长度">/{{ v6.prefix }}</ElDescriptionsItem>
        <ElDescriptionsItem label="网络地址">{{ v6.network }}</ElDescriptionsItem>
        <ElDescriptionsItem label="最后地址">{{ v6.lastAddress }}</ElDescriptionsItem>
        <ElDescriptionsItem label="地址总数">{{ v6.totalCount }}</ElDescriptionsItem>
        <ElDescriptionsItem label="地址类型">{{ v6.scope }}</ElDescriptionsItem>
      </ElDescriptions>
      <div class="output-actions">
        <span class="copy-label">复制网段：</span>
        <CopyButton v-if="v4" :text="`${v4.network}/${v4.prefix}`" />
        <CopyButton v-else-if="v6" :text="v6.network" />
      </div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.example-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.example-row .field-label {
  margin-bottom: 0;
}

.example-row .el-button {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
}

.output-actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
