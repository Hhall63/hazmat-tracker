import { TankGauge } from './TankGauge'
import { TankControls } from './TankControls'
import { AddTankForm } from './AddTankForm'
import type { Tank } from '@/lib/types'

export function TankSection({
  tanks,
  updatedBy,
  onChanged,
}: {
  tanks: Tank[]
  updatedBy: string
  onChanged: () => void
}) {
  const inUse = tanks.filter((t) => t.status === 'in_use')
  const spares = tanks.filter((t) => t.status === 'spare')

  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">Cylinders</h2>
      <div className="flex flex-wrap gap-4">
        {inUse.map((tank) => (
          <div key={tank.id}>
            <TankGauge tank={tank} />
            <TankControls tank={tank} updatedBy={updatedBy} onChanged={onChanged} />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-medium">Spare tanks: {spares.length}</h3>
        <ul className="text-sm">
          {spares.map((tank) => (
            <li key={tank.id} className="mb-1">
              {tank.gasType} — {tank.psi} psi
              <TankControls tank={tank} updatedBy={updatedBy} onChanged={onChanged} />
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <AddTankForm updatedBy={updatedBy} onAdded={onChanged} />
      </div>
    </section>
  )
}
